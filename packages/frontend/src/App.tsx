import { RouterProvider } from 'react-router';
import { router } from './router/index';

export default function App() {
  return <RouterProvider router={router} />;
}
