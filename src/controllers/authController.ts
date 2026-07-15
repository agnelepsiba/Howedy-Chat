import type { Request, Response } from "express";
import * as authService from "../services/authService.js";
import { ApiResponse } from "../utils/apiResponse.js";


export const register = async (
  req: Request,
  res: Response
): Promise<void> => {
  const data = await authService.register(req.body);

  res.status(201).json(
    new ApiResponse(true, "User registered successfully", data)
  );
};

export const login = async (
  req: Request,
  res: Response
): Promise<void> => {
  const data = await authService.login(req.body);

  res.status(200).json(
    new ApiResponse(true, "Login successful", data)
  );
};

export const myProfile = async (
  req: Request & { auth?: { sub: string } },
  res: Response
): Promise<void> => {
  const data = await authService.myProfile(req.auth!.sub);

  res.status(200).json(
    new ApiResponse(true, "User fetched successfully", data)
  );
};

export const getAllUsers = async (
  req: Request & { auth?: { sub: string } },
  res: Response
): Promise<void> => {
  const data = await authService.getAllUsers(req.auth!.sub);

  res.status(200).json(
    new ApiResponse(true, "Users fetched successfully", data)
  );
};