export const notFoundHandler = (err, req, res, next) => {
  if (err.status === 404 || err.name === "CastError") {
    console.log(err);
    res.status(404).send(err.message);
  } else {
    next(err);
  }
};

export const badRequestHandler = (err, req, res, next) => {
  if (err.status === 400 || err.name === "ValidationError") {
    console.log(err);
    res.status(400).send(err.errors.content.message);
  } else {
    next(err);
  }
};

export const forbiddenHandler = (err, req, res, next) => {
  if (err.status === 403) {
    console.log(err);
    res.status(403).send(err.message);
  } else {
    next(err);
  }
};

export const genericServerErrorHandler = (err, req, res, next) => {
  console.log(err);
  res.status(500).send("Generic server Error, contact support.");
};
