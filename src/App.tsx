/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { UserWarning } from './UserWarning';
import { getTodos, createTodo, deleteTodo, USER_ID } from './api/todos';
import { NewTodoForm } from './components/NewTodoForm';
import { Todo } from './types/Todo';
import { TodoList } from './components/TodoList';
import { Filter, FILTERS } from './types/Filters';
import { ErrorNotification } from './components/ErrorNotification';
import { FilterComponent } from './components/FilterComponent';

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  const [loadingIds, setLoadingIds] = useState<number[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [error, setError] = useState<string | null>(null);

  // Ref do focusowania inputa
  const todoFieldRef = useRef<HTMLInputElement>(null);

  const focusField = () => {
    todoFieldRef.current?.focus();
  };

  //error
  const errorTimeoutRef = useRef<number | null>(null);

  const showError = (message: string) => {
    setError(message);

    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }

    errorTimeoutRef.current = window.setTimeout(() => {
      setError(null);
      errorTimeoutRef.current = null;
    }, 3000);
  };

  useEffect(() => {
    if (!USER_ID) {
      return;
    }

    getTodos()
      .then(setTodos)
      .catch(() => showError('Unable to load todos'));

    focusField();

    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  const handleAdd = async (title: string): Promise<boolean> => {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      showError('Title should not be empty');
      focusField();

      return false;
    }

    setTempTodo({
      id: 0,
      userId: USER_ID,
      title: trimmedTitle,
      completed: false,
    });

    try {
      const newTodo = await createTodo({ title: trimmedTitle });

      setTodos(current => [...current, newTodo]);
      setTempTodo(null);
      setTimeout(focusField, 0);

      return true;
    } catch {
      showError('Unable to add a todo');
      setTempTodo(null);
      setTimeout(focusField, 0);

      return false;
    }
  };

  const handleDelete = async (id: number) => {
    setLoadingIds(prev => [...prev, id]);
    try {
      await deleteTodo(id);
      setTodos(prev => prev.filter(t => t.id !== id));
      focusField();
    } catch {
      showError('Unable to delete a todo');
    } finally {
      setLoadingIds(prev => prev.filter(lid => lid !== id));
    }
  };

  const handleClearCompleted = async () => {
    const completedTodos = todos.filter(t => t.completed);

    await Promise.allSettled(completedTodos.map(todo => handleDelete(todo.id)));
    focusField();
  };

  const filteredTodos = useMemo(() => {
    switch (filter) {
      case FILTERS.active:
        return todos.filter(t => !t.completed);
      case FILTERS.completed:
        return todos.filter(t => t.completed);
      default:
        return todos;
    }
  }, [todos, filter]);

  if (!USER_ID) {
    return <UserWarning />;
  }

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          {(todos.length > 0 || tempTodo) && (
            <button
              type="button"
              className={`todoapp__toggle-all ${todos.every(t => t.completed) ? 'active' : ''}`}
              data-cy="ToggleAllButton"
            />
          )}

          <NewTodoForm
            onAdd={handleAdd}
            loading={!!tempTodo}
            todoFieldRef={todoFieldRef}
          />
        </header>

        {(todos.length > 0 || tempTodo) && (
          <TodoList
            todos={filteredTodos}
            tempTodo={tempTodo}
            loadingIds={loadingIds}
            onDelete={handleDelete}
          />
        )}

        {/* Footer */}
        {(todos.length > 0 || tempTodo) && (
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="TodosCounter">
              {todos.filter(t => !t.completed).length} items left
            </span>
            <FilterComponent current={filter} onChange={setFilter} />
            <button
              type="button"
              className="todoapp__clear-completed"
              data-cy="ClearCompletedButton"
              disabled={!todos.some(t => t.completed)}
              onClick={handleClearCompleted}
            >
              Clear completed
            </button>
          </footer>
        )}
      </div>
      <ErrorNotification message={error} onClose={() => setError(null)} />
    </div>
  );
};
