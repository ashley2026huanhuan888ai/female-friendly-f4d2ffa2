import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/object/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/objects/$id",
      params: { id: params.id },
      replace: true,
    });
  },
});
