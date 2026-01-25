import { Outlet } from "react-router";
import Layout from "../components/Layout";
import { useAuth } from "../components/AuthProvider";

export default function AppLayout() {
  const user = useAuth();
  return (
    <Layout user={user}>
      <Outlet context={{ user }} />
    </Layout>
  );
}
