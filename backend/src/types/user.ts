type User = {
  id: number;
  email: string;
  password: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export default User;
