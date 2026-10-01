import type { APIRoute } from 'astro';
import { accessErrorResponse, getFAQEntitlement, jsonResponse } from '../../backend/faq-entitlement';

export const GET: APIRoute = async ({ request }) => {
  try { return jsonResponse(await getFAQEntitlement(request)); }
  catch (error) { return accessErrorResponse(error); }
};
