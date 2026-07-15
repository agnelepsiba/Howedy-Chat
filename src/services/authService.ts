import { loginSchema, registerSchema } from "../validators/authValidators.js";
import * as authRepository from "../repositories/authRepository.js";
import { hashPassword } from "../models/User.js";
import { signToken } from "./jwtServices.js";
import { ApiError } from "../middleware/errorHandler.js";

export const register = async (payload: unknown) => {
  const parsed = registerSchema.safeParse(payload);

  if (!parsed.success) {
    throw new ApiError(
      400,
      parsed.error.errors[0]?.message ?? "Invalid request payload"
    );
  }

  const { name, email, password } = parsed.data;

  const existingUser = await authRepository.findUserByEmail(email);

  if (existingUser) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const passwordHash = await hashPassword(password);

  const user = await authRepository.createUser({
    name,
    email,
    passwordHash,
  });

  return {
    token: signToken({
      sub: user.id,
      email: user.email,
    }),
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      isOnline: user.isOnline,
    },
  };
};

export const login = async (payload: unknown) => {
  const parsed = loginSchema.safeParse(payload);

  if (!parsed.success) {
    throw new ApiError(
      400,
      parsed.error.errors[0]?.message ?? "Invalid request payload"
    );
  }

  const { email, password } = parsed.data;

  const user = await authRepository.findUserByEmail(email);

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  return {
    token: signToken({
      sub: user.id,
      email: user.email,
    }),
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      isOnline: user.isOnline,
    },
  };
};

export const myProfile = async (userId: string) => {
  const user = await authRepository.findUserById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return {
    user,
  };
};

export const getAllUsers = async (currentUserId: string) => {
  const users = await authRepository.getAllUsers();

  // Exclude current user and only return necessary fields
  return users
    .filter((u) => u._id.toString() !== currentUserId)
    .map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      isOnline: u.isOnline,
      lastSeenAt: u.lastSeenAt,
    }));
};