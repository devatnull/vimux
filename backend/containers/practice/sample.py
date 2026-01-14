# Practice editing this Python file with Neovim!
# Try: cw (change word), dap (delete around paragraph), >> (indent)

def quicksort(arr):
    """Classic quicksort implementation"""
    if len(arr) <= 1:
        return arr
    
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    
    return quicksort(left) + middle + quicksort(right)


class TodoList:
    """A simple todo list manager"""
    
    def __init__(self):
        self.tasks = []
    
    def add_task(self, task):
        self.tasks.append({
            'task': task,
            'completed': False
        })
    
    def complete_task(self, index):
        if 0 <= index < len(self.tasks):
            self.tasks[index]['completed'] = True
    
    def list_tasks(self):
        for i, task in enumerate(self.tasks):
            status = "✓" if task['completed'] else " "
            print(f"[{status}] {i}: {task['task']}")


# Try these exercises:
# 1. Add a remove_task method
# 2. Add a clear_completed method
# 3. Practice using visual mode (v) to select and delete


if __name__ == "__main__":
    numbers = [3, 6, 8, 10, 1, 2, 1]
    print("Sorted:", quicksort(numbers))
    
    todos = TodoList()
    todos.add_task("Learn Neovim motions")
    todos.add_task("Master tmux panes")
    todos.add_task("Practice daily")
    todos.list_tasks()
