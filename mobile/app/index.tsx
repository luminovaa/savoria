import { Redirect } from "expo-router";
import { useAuth } from "@/context/auth-provider";

export default function Index() {
  const { initialized, user } = useAuth();

  if (!initialized) return null;
  if (user) return <Redirect href="/(app)/(protected)/home" />;

  return <Redirect href="/(app)/welcome" />;
}
