/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useEffect, useRef, useState } from 'react';
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
  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 3000);
  };

  // Wczytywanie todos
  useEffect(() => {
    getTodos()
      .then(setTodos)
      .catch(() => showError('Unable to load todos'));

    focusField();
  }, []);

  const handleAdd = async (title: string): Promise<boolean> => {
    const trimmedTitle = title.trim();

    // Walidacja pustego tytułu
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

    // Wykonujemy wszystkie usunięcia równolegle
    await Promise.allSettled(completedTodos.map(todo => handleDelete(todo.id)));
    focusField();
  };

  // Filtrowanie todos
  const filteredTodos =
    filter === FILTERS.all
      ? todos
      : filter === FILTERS.active
        ? todos.filter(t => !t.completed)
        : todos.filter(t => t.completed);

  if (!USER_ID) {
    return <UserWarning />;
  }

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          <NewTodoForm
            onAdd={handleAdd}
            loading={!!tempTodo}
            todoFieldRef={todoFieldRef}
          />
        </header>

        <TodoList
          todos={filteredTodos}
          tempTodo={tempTodo}
          loadingIds={loadingIds}
          onDelete={handleDelete}
        />

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
