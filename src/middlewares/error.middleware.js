export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

export const errorHandler = (error, req, res, next) => {
  console.error(error);

  if (res.headersSent) {
    return next(error);
  }

  const databaseErrors = {
    "42P01": "A required database table is missing. Run the latest database migrations with the table-owner account",
    "22P02": "One or more submitted values have an invalid format",
    "23503": "The selected member does not exist or is no longer available",
    "23505": "A record with these details already exists",
    "23514": "The submitted penalty details violate a database rule",
  };
  const constraintMessages = {
    idx_social_fund_reference: "This Social Fund reference has already been used. Enter a unique reference or leave it blank",
  };
  const databaseMessage = constraintMessages[error.constraint] ?? databaseErrors[error.code];
  const statusCode = error.statusCode ?? (databaseMessage ? 400 : 500);

  return res.status(statusCode).json({
    success: false,
    message: databaseMessage ?? (statusCode === 500 ? "Internal server error" : error.message),
  });
};
