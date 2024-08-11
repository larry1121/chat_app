import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import backend.chat.websocket_urls

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.project.settings')

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': AuthMiddlewareStack(
        URLRouter(
            backend.chat.websocket_urls.websocket_urlpatterns
        )
    ),
})
