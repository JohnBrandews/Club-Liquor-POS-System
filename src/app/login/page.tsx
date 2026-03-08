import { LoginForm } from "./LoginForm";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { next?: string };
}) {
  const nextPath = typeof searchParams?.next === "string" ? searchParams.next : "/pos";
  return <LoginForm nextPath={nextPath} />;
}

