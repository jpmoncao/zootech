import type { Metadata } from "next";
import { LoginScreen } from "../components/login-screen";

export const metadata: Metadata = {
  title: "Entrar",
};

export default function Page() {
  return <LoginScreen />;
}
