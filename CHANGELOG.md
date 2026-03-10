# Changelog

## v1.0.0

Initial production release.

**Core features**
- Merchant registration with xPub HD wallet support
- Payment session API (create, poll, cancel)
- Non-custodial address derivation per session using BIP-32/44
- HMAC-SHA256 signed webhooks with automatic retry
- WebSocket real-time payment status updates
- Drop-in embeddable payment widget
- Next.js merchant dashboard with session management and analytics
- Webhook delivery logs with full request/response history
- API key generation and rotation
- Kaspa testnet-10 and mainnet support

**Infrastructure**
- 71 passing tests across unit and integration paths
- GitHub Actions CI on every push
- Docker + Railway deployment config
- OpenAPI spec
- Architecture, security, and deployment documentation
