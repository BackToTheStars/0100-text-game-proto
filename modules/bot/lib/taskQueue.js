class TaskQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  enqueue(task) {
    this.queue.push(task);
    this.processQueue();
  }

  async processQueue() {
    if (this.isProcessing) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      try {
        await task();
      } catch (err) {
        // упавшая задача не должна заклинивать очередь
        // и ронять процесс необработанным rejection
        console.error('TaskQueue task failed:', err);
      }
    }

    this.isProcessing = false;
  }
}

module.exports = {
  TaskQueue
}