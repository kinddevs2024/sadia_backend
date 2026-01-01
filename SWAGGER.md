# Swagger API Documentation

This project includes Swagger/OpenAPI documentation for all API endpoints.

## Accessing the Documentation

Once the server is running, you can access the Swagger UI at:

```
http://localhost:3000/swagger
```

The OpenAPI JSON specification is available at:

```
http://localhost:3000/api/docs
```

## Adding Documentation to Routes

To document your API routes, add JSDoc comments with Swagger annotations above your route handlers. Here's an example:

```typescript
/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // Route implementation
}
```

## Authentication

To indicate that an endpoint requires authentication, add the security annotation:

```typescript
/**
 * @swagger
 * /api/admin/products:
 *   get:
 *     summary: Get all products (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of products
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
```

## Common Schemas

The following schemas are pre-defined in the Swagger configuration:

- `User` - User object
- `Product` - Product object
- `Order` - Order object
- `Error` - Error response
- `SuccessResponse` - Success response wrapper

You can reference these in your documentation using `$ref: '#/components/schemas/SchemaName'`.

## Testing APIs

The Swagger UI includes a "Try it out" feature that allows you to:

1. Fill in parameters
2. Add authentication headers
3. Send requests directly from the browser
4. View responses

### Adding Authentication Token

1. Click the "Authorize" button at the top of the Swagger UI
2. Enter your JWT token in the format: `Bearer <your-token>`
3. Click "Authorize"
4. All authenticated requests will now include the token automatically

## Example Routes

Example Swagger documentation has been added to:

- `/api/auth/login` - User login
- `/api/products` - Product listing and creation
- `/api/orders` - Order listing and creation
- `/api/health` - Health check

You can use these as templates for documenting other routes.

## Tags

Routes are organized into the following tags:

- `Auth` - Authentication endpoints
- `Products` - Product management
- `Categories` - Category management
- `Orders` - Order management
- `Reviews` - Review management
- `Admin` - Admin panel endpoints
- `Telegram` - Telegram bot endpoints
- `POS` - Point of Sale endpoints
- `Inventory` - Inventory management
- `Support` - Support messages
- `Health` - Health checks

