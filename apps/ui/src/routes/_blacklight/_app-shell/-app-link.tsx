import type { AnyRouter, LinkComponentProps, RegisteredRouter } from "@tanstack/react-router";
import { Link, useParams } from "@tanstack/react-router";
import type { ReactElement } from "react";

export function AppLink<
  TRouter extends AnyRouter = RegisteredRouter,
  const TFrom extends string = string,
  const TTo extends string | undefined = undefined,
  const TMaskFrom extends string = TFrom,
  const TMaskTo extends string = "",
>(
  props: Omit<LinkComponentProps<"a", TRouter, TFrom, TTo, TMaskFrom, TMaskTo>, "params"> & {
    params?: Omit<
      Extract<LinkComponentProps<"a", TRouter, TFrom, TTo, TMaskFrom, TMaskTo>["params"], object>,
      "appSlug"
    >;
  },
): ReactElement {
  const { appSlug } = useParams({ from: "/_blacklight/_app-shell/app/$appSlug" });
  const { params, ...rest } = props;
  return <Link {...(rest as any)} params={{ ...params, appSlug }} />;
}
