import { Schema } from "effect"

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

export const ProductId = Schema.String.pipe(Schema.brand("ProductId"))
export type ProductId = typeof ProductId.Type

export const OrderId = Schema.String.pipe(Schema.brand("OrderId"))
export type OrderId = typeof OrderId.Type

export const CategoryId = Schema.Literals([
  "sofas",
  "chairs",
  "tables",
  "beds",
  "storage",
  "lighting",
  "decor",
  "textiles",
  "kitchen",
  "outdoor"
])
export type CategoryId = typeof CategoryId.Type

export const RoomId = Schema.Literals(["living-room", "bedroom", "dining", "workspace", "outdoor"])
export type RoomId = typeof RoomId.Type

/** The illustration used to draw a product (products ship as vector art, not photos). */
export const ArtKind = Schema.Literals([
  "sofa",
  "armchair",
  "dining-chair",
  "dining-table",
  "coffee-table",
  "desk",
  "bed",
  "bookcase",
  "dresser",
  "wardrobe",
  "floor-lamp",
  "table-lamp",
  "pendant-lamp",
  "rug",
  "plant",
  "mirror",
  "cushion",
  "throw",
  "mugs",
  "vase",
  "basket",
  "lounger"
])
export type ArtKind = typeof ArtKind.Type

/** Money is always an integer amount of cents. */
export const Cents = Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(0)))

export const Quantity = Schema.Int.pipe(Schema.check(Schema.isBetween({ minimum: 1, maximum: 99 })))

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export class Category extends Schema.Class<Category>("Category")({
  id: CategoryId,
  name: Schema.String,
  tagline: Schema.String,
  art: ArtKind,
  tint: Schema.String
}) {}

export class Room extends Schema.Class<Room>("Room")({
  id: RoomId,
  name: Schema.String,
  tagline: Schema.String
}) {}

export class ColorOption extends Schema.Class<ColorOption>("ColorOption")({
  id: Schema.String,
  name: Schema.String,
  hex: Schema.String
}) {}

export const Badge = Schema.Literals(["new", "lower-price", "top-seller", "limited"])
export type Badge = typeof Badge.Type

export class Product extends Schema.Class<Product>("Product")({
  id: ProductId,
  name: Schema.String,
  type: Schema.String,
  description: Schema.String,
  details: Schema.Array(Schema.String),
  dimensions: Schema.String,
  category: CategoryId,
  rooms: Schema.Array(RoomId),
  art: ArtKind,
  accent: Schema.String,
  colors: Schema.NonEmptyArray(ColorOption),
  price: Cents,
  previousPrice: Schema.optionalKey(Cents),
  rating: Schema.Number,
  reviewCount: Schema.Int,
  badge: Schema.optionalKey(Badge),
  stock: Schema.Int,
  popularity: Schema.Int,
  addedAt: Schema.String
}) {}

export const ProductSort = Schema.Literals(["popular", "price-asc", "price-desc", "newest", "rating"])
export type ProductSort = typeof ProductSort.Type

// ---------------------------------------------------------------------------
// Cart & checkout
// ---------------------------------------------------------------------------

/** A line in the shopper's bag. The bag itself lives on the client. */
export class CartLine extends Schema.Class<CartLine>("CartLine")({
  productId: ProductId,
  colorId: Schema.String,
  quantity: Quantity
}) {}

export const DeliveryMethod = Schema.Literals(["standard", "express", "pickup"])
export type DeliveryMethod = typeof DeliveryMethod.Type

export class QuoteRequest extends Schema.Class<QuoteRequest>("QuoteRequest")({
  lines: Schema.Array(CartLine),
  delivery: DeliveryMethod
}) {}

export class QuoteLine extends Schema.Class<QuoteLine>("QuoteLine")({
  product: Product,
  color: ColorOption,
  quantity: Schema.Int,
  unitPrice: Cents,
  lineTotal: Cents,
  available: Schema.Int
}) {}

export class Quote extends Schema.Class<Quote>("Quote")({
  lines: Schema.Array(QuoteLine),
  itemCount: Schema.Int,
  subtotal: Cents,
  savings: Cents,
  delivery: DeliveryMethod,
  deliveryFee: Cents,
  freeDeliveryThreshold: Cents,
  total: Cents
}) {}

const NonBlank = Schema.Trimmed.pipe(Schema.check(Schema.isMinLength(1, { message: "Required" })))

export const Email = Schema.Trimmed.pipe(
  Schema.check(Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { message: "Enter a valid email address" }))
)

export class Contact extends Schema.Class<Contact>("Contact")({
  fullName: NonBlank,
  email: Email,
  phone: Schema.optionalKey(Schema.Trimmed)
}) {}

export class Address extends Schema.Class<Address>("Address")({
  line1: NonBlank,
  line2: Schema.optionalKey(Schema.Trimmed),
  city: NonBlank,
  postalCode: NonBlank,
  country: NonBlank
}) {}

export class PlaceOrderRequest extends Schema.Class<PlaceOrderRequest>("PlaceOrderRequest")({
  lines: Schema.NonEmptyArray(CartLine),
  delivery: DeliveryMethod,
  contact: Contact,
  address: Address
}) {}

export const OrderStatus = Schema.Literals(["confirmed", "packing", "shipped", "delivered"])

export class Order extends Schema.Class<Order>("Order")({
  id: OrderId,
  status: OrderStatus,
  placedAt: Schema.String,
  estimatedDelivery: Schema.String,
  contact: Contact,
  address: Address,
  quote: Quote
}) {}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class ProductNotFound extends Schema.TaggedError<ProductNotFound>()(
  "ProductNotFound",
  { productId: Schema.String },
  { httpApiStatus: 404 }
) {}

export class OrderNotFound extends Schema.TaggedError<OrderNotFound>()(
  "OrderNotFound",
  { orderId: Schema.String },
  { httpApiStatus: 404 }
) {}

export class InvalidColor extends Schema.TaggedError<InvalidColor>()(
  "InvalidColor",
  { productId: Schema.String, colorId: Schema.String },
  { httpApiStatus: 422 }
) {}

export class OutOfStock extends Schema.TaggedError<OutOfStock>()(
  "OutOfStock",
  { productId: Schema.String, name: Schema.String, requested: Schema.Int, available: Schema.Int },
  { httpApiStatus: 409 }
) {}
