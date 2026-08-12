import { Navigate } from 'react-router-dom';

/**
 * WhatsApp-only host: /services is no longer a multi-channel gallery.
 * Send users straight into WhatsApp workspace creation.
 */
export function ServicesGalleryPage() {
  return <Navigate to="/services/whatsapp/new" replace />;
}
