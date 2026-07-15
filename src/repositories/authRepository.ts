
import { User } from "../models/User.js";

export const findUserByEmail = (email: string) => {
  return User.findOne({ email });
};

export const findUserById = (id: string) => {
  return User.findById(id).select("-passwordHash");
};

export const createUser = (payload: {
  name: string;
  email: string;
  passwordHash: string;
}) => {
  return User.create(payload);
};

export const getAllUsers = () => {
  return User.find().select("-passwordHash");
};