import z from "zod";

export const locationInputSchema = z.object({
    name: z.string().max(50),
    city: z.string().max(50),
    state: z.string().max(50),
    country: z.string().max(50),
});

export const locationIdSchema = z
    .string()
    .regex(/^\d{7}$/, "locationId must be a 7-digit number");

export function validateLocationInput(body: unknown) {
    return locationInputSchema.safeParse(body);
}

export function validateLocationId(id: unknown) {
    return locationIdSchema.safeParse(id);
}

export function formatValidationErrors(error: z.ZodError) {
    return z.treeifyError(error);
}
