import React, { useEffect, useReducer }                                 from "react";
import ApolloClient                                                     from "apollo-client";
import { ApolloProvider }                                               from "react-apollo";
import { add, deleteTodo, editTodo, getList, searchTodo, setCompleted } from "../client";
import { ApolloLink, NextLink, Observable, Operation } from 'apollo-link';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { onError } from 'apollo-link-error';
import { BatchHttpLink } from 'apollo-link-batch-http';

const initialState = {
    todoList: [],
    checkedList: [],
    searchStr: "",
    loading: false
};

const Context = React.createContext({
    state: initialState,
    dispatch: () => {
    }
});

// 请求拦截器
const request = async (operation) => {
    // 可以设置token
    operation.setContext({
      headers: {}
    })
    return Promise.resolve()
  }
  
  const requestLink = new ApolloLink((operation, forward) => {
    return new Observable(observer => {
      let handle
      Promise.resolve(operation)
        .then(oper => request(oper))
        .then(() => {
          handle = forward(operation).subscribe({
            next: observer.next.bind(observer),
            error: observer.error.bind(observer),
            complete: observer.complete.bind(observer),
          });
        })
        .catch(observer.error.bind(observer));
        
        return () => {
          if (handle) {
            handle.unsubscribe()
          }
        }
  
    })
  }) 

const Client = new ApolloClient({
    link: ApolloLink.from([
    //   onError(({ graphQLErrors }) => {
    //     // 全局错误处理
    //     if (Array.isArray(graphQLErrors)) {
    //       message.error(graphQLErrors[0].message)
    //     }
    //   }),
      requestLink,
      new BatchHttpLink({ uri: 'http://localhost:4000/graphql' }),
    ]),
    cache: new InMemoryCache(),
  });

const reducer = (state, action) => {
    switch (action.type) {
        case "GET_LIST": {
            const { todoList } = action;
            return {
                ...state,
                loading: false,
                todoList
            };
        }
        case "CHANGE_CHECKED_LIST": {
            const { checkedList } = action;
            return {
                ...state,
                checkedList
            };
        }
        case "SET_LOADING": {
            return {
                ...state,
                loading: true
            };
        }
        default:
            return state;
    }
};

const asyncDispatch = dispatch => async action => {
    const setList = (func = ({ data }) => data) => ({ data }) => {
        const { todoList } = func(data);
        dispatch({
            type: "GET_LIST",
            todoList
        });
    };
    switch (action.type) {
        case "GET_LIST": {
            dispatch({ type: "SET_LOADING" });
            return await getList().then(setList(data => data));
        }
        case "ADD": {
            dispatch({ type: "SET_LOADING" });
            const { content } = action;
            return await add(content).then(setList());
        }
        case "DELETE": {
            dispatch({ type: "SET_LOADING" });
            const { ids } = action;
            return await deleteTodo(ids).then(setList());
        }
        case "EDIT": {
            dispatch({ type: "SET_LOADING" });
            const { id, content } = action;
            return await editTodo(id, content).then(setList());
        }
        case "SEARCH": {
            dispatch({ type: "SET_LOADING" });
            const { content } = action;
            return await searchTodo(content).then(setList(data => data));
        }
        case "SET_COMPLETED": {
            dispatch({ type: "SET_LOADING" });
            const { id, completed } = action;
            return await setCompleted(id, completed).then(setList());
        }
        default:
            dispatch(action);
    }
};
const useAsyncReducer = () => {
    const [state, dispatch] = useReducer(reducer, initialState);
    return [state, asyncDispatch(dispatch)];
};
const Provider = props => {
    const [state, dispatch] = useAsyncReducer();
    useEffect(() => {
        dispatch({
            type: "GET_LIST"
        });
    }, []);
    return (
        <ApolloProvider client={ Client } >
            <Context.Provider value={ { state, dispatch } } >
                { props.children }
            </Context.Provider >
        </ApolloProvider >
    );
};

export default Provider;
export { Context, Client };
