import z from "zod";

export const locationInputSchema = z.object({
    name: z.string().max(50),
    city: z.string().max(50),
    state: z.string().max(50),
    country: z.string().max(50),
});

export const locationIdSchema = z
    .string()
    .min(6, "locationId must be between 6 and 12 characters")
    .max(12, "locationId must be between 6 and 12 characters");

export const createLocationInputSchema = locationInputSchema.extend({
    locationId: locationIdSchema,
});

export function validateLocationInput(body: unknown) {
    return locationInputSchema.safeParse(body);
}

export function validateCreateLocationInput(body: unknown) {
    return createLocationInputSchema.safeParse(body);
}

export function validateLocationId(id: unknown) {
    return locationIdSchema.safeParse(id);
}

export function formatValidationErrors(error: z.ZodError) {
    return z.treeifyError(error);
}
