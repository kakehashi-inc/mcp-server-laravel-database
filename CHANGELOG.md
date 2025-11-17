# Changelog

All notable changes to this project will be documented in this file.

## [0.1.1] - 2025-11-17

### Changed

- Enforced configuration precedence (_environment variables < `.env` file < CLI arguments_) so Sail-specific ports (`FORWARD_DB_PORT`) and host overrides behave consistently regardless of which inputs are provided.

## [0.1.0] - 2025-11-17

- Initial release of MCP Laravel Database
