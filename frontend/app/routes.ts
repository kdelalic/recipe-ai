import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
    layout("routes/layout_app.jsx", [
        index("pages/Home.jsx"), // path "/"
        route("recipe/:id", "pages/RecipeDetail.jsx"),
        route("preferences", "pages/Preferences.jsx"),
    ]),
    route("login", "pages/Login.jsx"),
    route("signup", "pages/SignUp.jsx"),
    route("health", "routes/health.jsx"),
    route("*", "pages/NotFound.jsx"),
] satisfies RouteConfig;
