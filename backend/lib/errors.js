class WorkflowError extends Error {
  constructor(code, message, status = 400, retryable = false, details) {
    super(message);
    this.name = 'WorkflowError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
    this.details = details;
  }
}

function asWorkflowError(error) {
  if (error instanceof WorkflowError) return error;
  return new WorkflowError('INTERNAL_ERROR', 'Unexpected workflow failure', 500, true);
}

module.exports = { WorkflowError, asWorkflowError };
