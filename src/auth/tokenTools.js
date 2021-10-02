import jwt from "jsonwebtoken";

// ========= turn jwt into promises, because originally it works with callback
// generate token from author Id
const generateJWT = (authorId) =>
  new Promise((resolve, reject) =>
    jwt.sign(
      authorId,
      process.env.JWT_SECRET,
      { expiresIn: "7 days" },
      (err, token) => {
        if (err) {
          reject(err);
        } else {
          resolve(token);
        }
      }
    )
  );

//verify token In the login
export const verifyJWT = (token) => {
  return new Promise((resolve, reject) =>
    jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
      if (err) {
        reject(err);
      } else {
        resolve(decodedToken);
      }
    })
  );
};

//return token
export const generateJWTTokens = async (author) => {
  const accessToken = await generateJWT({ _id: author._id });

  return accessToken;
};
