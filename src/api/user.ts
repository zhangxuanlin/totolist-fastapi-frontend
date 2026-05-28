import request from '../utils/axios';

// 用户相关 API

export interface User {
  id: string;
  username: string;
  password: string;
  nickname: string;
  avatar: string;
  role: string;
  status: 1 | 0;
  created_at: string;
  updated_at: string;
}

export interface UserListResponse {
  data: User[];
  total: number;
}

// 获取用户列表
export const getUserList = (params?: {
  page?: number;
  page_size?: number;
  username?: string;
  nickname?: string;
  status?: string;
  role?: string;
}) => {
  return request.get<UserListResponse>('/users/list', params);
};

// 删除用户
export const deleteUser = (id: string) => {
  return request.post(`/users/delete`, { id });
};

// 编辑用户
export const editUser = (data: {
  id: string;
  nickname?: string;
  avatar?: File | string | undefined;
  role?: string;
  status?: 1 | 0;
  password?: string;
}) => {
  const formData = new FormData();
  formData.append('id', data.id);
  if (data.nickname) formData.append('nickname', data.nickname);
  if (data.avatar) formData.append('avatar', data.avatar);
  if (data.role) formData.append('role', data.role);
  if (data.status !== undefined) formData.append('status', String(data.status));
  if (data.password) formData.append('password', data.password);
  return request.post<User>('/users/edit', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// 批量删除用户
export const batchDeleteUsers = (ids: string[]) => {
  return request.post('/users/batch-delete', { ids });
};

// 用户注册
export interface RegisterResponse {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  role: string;
  status: '1' | '0';
  created_at: string;
}

export const registerUser = (data: {
  username: string;
  password: string;
  nickname?: string;
  avatar?: File | string | undefined;
  role?: string;
  status?: number
}) => {
  const formData = new FormData();
  formData.append('username', data.username);
  formData.append('password', data.password);
  if (data.nickname) formData.append('nickname', data.nickname);
  if (data.avatar) formData.append('avatar', data.avatar);
  if (data.role) formData.append('role', data.role);
  if (data.status !== undefined) formData.append('status', String(data.status));
  return request.post<RegisterResponse>('/users/add', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
