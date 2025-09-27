"""
Custom CORS middleware for ASGI applications.
"""
from django.conf import settings
from django.http import HttpResponse
from django.utils.deprecation import MiddlewareMixin


class CorsMiddleware(MiddlewareMixin):
    """
    Custom CORS middleware that works with both WSGI and ASGI.
    """
    
    def process_request(self, request):
        """
        Handle preflight OPTIONS requests.
        """
        if request.method == 'OPTIONS':
            response = HttpResponse()
            self.add_cors_headers(response, request)
            return response
        return None
    
    def process_response(self, request, response):
        """
        Add CORS headers to all responses.
        """
        self.add_cors_headers(response, request)
        return response
    
    def add_cors_headers(self, response, request):
        """
        Add CORS headers to the response.
        """
        # Get the origin from the request
        origin = request.META.get('HTTP_ORIGIN')
        
        # For development, allow all origins. For production, use specific origins.
        is_development = getattr(settings, 'DEBUG', False) or origin in [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:8000',
            'http://127.0.0.1:8000',
        ]
        
        if is_development:
            # In development, allow all origins
            if origin:
                response['Access-Control-Allow-Origin'] = origin
            else:
                response['Access-Control-Allow-Origin'] = '*'
            
            response['Access-Control-Allow-Credentials'] = 'true'
            response['Access-Control-Allow-Methods'] = 'DELETE, GET, OPTIONS, PATCH, POST, PUT'
            response['Access-Control-Allow-Headers'] = (
                'accept, accept-encoding, authorization, content-type, dnt, '
                'origin, user-agent, x-csrftoken, x-requested-with'
            )
            response['Access-Control-Max-Age'] = '86400'
        else:
            # In production, use more restrictive CORS settings
            allowed_origins = [
                'https://match.connectier.app',
                'https://api.match.connectier.app',
            ]
            
            if origin in allowed_origins:
                response['Access-Control-Allow-Origin'] = origin
                response['Access-Control-Allow-Credentials'] = 'true'
                response['Access-Control-Allow-Methods'] = 'DELETE, GET, OPTIONS, PATCH, POST, PUT'
                response['Access-Control-Allow-Headers'] = (
                    'accept, accept-encoding, authorization, content-type, dnt, '
                    'origin, user-agent, x-csrftoken, x-requested-with'
                )
