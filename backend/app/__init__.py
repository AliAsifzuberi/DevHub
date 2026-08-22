"""
DevHub backend — FastAPI application package.

Purpose: the application tier of the three-tier architecture. This package
owns business rules, authentication, and the REST API. It never talks to the
browser directly except over HTTP; the React SPA is a separate process.
"""
