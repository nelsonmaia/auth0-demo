import { Schema } from "effect"

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

export const ProductId = Schema.String.pipe(Schema.brand("ProductId"))
export type ProductId = typeof ProductId.Type

export const OrderId = Schema.String.pipe(Schema.brand("OrderId"))
export type OrderId = typeof OrderId.Type

export const CategoryId = Schema.Literals(["shoes", "clothing", "accessories"])
export type CategoryId = typeof CategoryId.Type

export const Gender = Schema.Literals(["men", "women", "kids"])
export type Gender = typeof Gender.Type

export const SportId = Schema.Literals(["running", "training", "lifestyle", "basketball", "trail"])
export type SportId = typeof SportId.Type

export const ColorFamily = Schema.Literals([
  "black",
  "white",
  "grey",
  "blue",
  "green",
  "red",
  "orange",
  "pink",
  "purple",
  "yellow",
  "brown"
])
export type ColorFamily = typeof ColorFamily.Type

/** The vector illustration used to draw a product (no photos needed). */
export const ArtKind = Schema.Literals([
  "runner",
  "racer",
  "trail",
  "court-low",
  "court-high",
  "trainer",
  "slide",
  "tee",
  "hoodie",
  "jacket",
  "shorts",
  "leggings",
  "socks",
  "cap",
  "bag"
])
export type ArtKind = typeof ArtKind.Type

/** Money is always an integer amount of cents. */
export const Cents = Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(0)))

export const Quantity = Schema.Int.pipe(Schema.check(Schema.isBetween({ minimum: 1, maximum: 10 })))

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export class Sport extends Schema.Class<Sport>("Sport")({
  id: SportId,
  name: Schema.String,
  tagline: Schema.String
}) {}

/** A colourway, e.g. "Black/White-Volt". */
export class ColorOption extends Schema.Class<ColorOption>("ColorOption")({
  id: Schema.String,
  name: Schema.String,
  family: ColorFamily,
  primary: Schema.String,
  secondary: Schema.String,
  tertiary: Schema.String
}) {}

export const Badge = Schema.Literals(["just-in", "bestseller", "limited", "sustainable"])
export type Badge = typeof Badge.Type

export class Product extends Schema.Class<Product>("Product")({
  id: ProductId,
  name: Schema.String,
  subtitle: Schema.String,
  description: Schema.String,
  details: Schema.Array(Schema.String),
  styleCode: Schema.String,
  category: CategoryId,
  genders: Schema.Array(Gender),
  sport: SportId,
  art: ArtKind,
  colors: Schema.NonEmptyArray(ColorOption),
  sizes: Schema.NonEmptyArray(Schema.String),
  unavailableSizes: Schema.Array(Schema.String),
  price: Cents,
  previousPrice: Schema.optionalKey(Cents),
  rating: Schema.Number,
  reviewCount: Schema.Int,
  badge: Schema.optionalKey(Badge),
  stock: Schema.Int,
  popularity: Schema.Int,
  addedAt: Schema.String
}) {}

export const ProductSort = Schema.Literals(["featured", "newest", "price-desc", "price-asc"])
export type ProductSort = typeof ProductSort.Type

// ---------------------------------------------------------------------------
// Bag & checkout
// ---------------------------------------------------------------------------

/** A line in the shopper's bag. The bag itself lives in the browser. */
export class CartLine extends Schema.Class<CartLine>("CartLine")({
  productId: ProductId,
  colorId: Schema.String,
  size: Schema.String,
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
  size: Schema.String,
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
  total: Cents,
  member: Schema.Boolean
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
  customerId: Schema.optionalKey(Schema.String),
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

export class InvalidSize extends Schema.TaggedError<InvalidSize>()(
  "InvalidSize",
  { productId: Schema.String, name: Schema.String, size: Schema.String },
  { httpApiStatus: 422 }
) {}

export class OutOfStock extends Schema.TaggedError<OutOfStock>()(
  "OutOfStock",
  { productId: Schema.String, name: Schema.String, requested: Schema.Int, available: Schema.Int },
  { httpApiStatus: 409 }
) {}
