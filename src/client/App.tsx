import { createBrowserRouter, RouterProvider } from "react-router"
import { Layout } from "./components/Layout.tsx"
import { CartPage } from "./pages/Cart.tsx"
import { CheckoutPage } from "./pages/Checkout.tsx"
import { HomePage } from "./pages/Home.tsx"
import { AccountPage, CreditsPage, FavouritesPage, NotFoundPage, OrderPage, OrdersPage } from "./pages/Other.tsx"
import { ProductListPage } from "./pages/ProductList.tsx"
import { ProductPage } from "./pages/ProductPage.tsx"

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "shop", element: <ProductListPage /> },
      { path: "search", element: <ProductListPage /> },
      { path: "product/:id", element: <ProductPage /> },
      { path: "cart", element: <CartPage /> },
      { path: "checkout", element: <CheckoutPage /> },
      { path: "order/:id", element: <OrderPage /> },
      { path: "orders", element: <OrdersPage /> },
      { path: "favourites", element: <FavouritesPage /> },
      { path: "account", element: <AccountPage /> },
      { path: "credits", element: <CreditsPage /> },
      { path: "*", element: <NotFoundPage /> }
    ]
  }
])

export function App() {
  return <RouterProvider router={router} />
}
