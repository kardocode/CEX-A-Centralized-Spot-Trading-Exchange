# Beginner-Friendly Centralized Exchange (CEX)

This project is my attempt to understand how a **Centralized Exchange (CEX)** works internally instead of just using one.

Rather than building another CRUD application, I wanted to explore concepts like order matching, balance locking, order books, and communication between a backend server and a matching engine.

The goal is to keep the implementation simple enough that someone learning backend development can follow the flow of an order from the API to the matching engine.

> **Status:** 🚧 Still under development.

---

## Current Features

- User Signup & Signin
- Asset Balance Management
- Free & Locked Balances
- Place Orders
- Matching Engine
- In-Memory Order Book
- Queue-based communication between Backend and Matching Engine
- Trade Fill generation
- Market Depth API
- JSON logging for users and order book

---

## In Progress

- WebSocket integration
- Open Orders API
- Live Order Book updates
- Better persistence
- More validation and error handling

---

## Why I Built This

Most beginner backend projects are things like:

- Todo App
- Blog API
- URL Shortener
- Chat App

Those projects are great for learning APIs and databases, but I wanted to understand how systems like exchanges actually work behind the scenes.

This project is helping me learn about:

- Matching Engines
- Order Books
- Queue-based Architecture
- Balance Management
- Real-time Systems
- Backend System Design

---

## Architecture

```
Client
   │
HTTP API
   │
Backend
   │
Queue
   │
Matching Engine
   │
Order Book
   │
Balance Updates
```

The backend doesn't directly modify the order book. Every order goes through the matching engine, which is responsible for matching trades and updating balances.

---

## Tech Stack

- Node.js
- TypeScript
- HTTP
- WebSockets (Work in Progress)

---

## Project Status

This project is still being built.

Completed:

- Signup
- Signin
- Place Order
- Balance API
- Market Depth API
- Matching Engine
- Queue Communication

Currently Working On:

- WebSockets
- Open Orders API

Future Plans:

- Order Cancellation
- Database Persistence
- Docker
- Redis
- Better Logging

---

## Note

This project is built for learning purposes and is not intended for production use.

I'm trying to keep the code clean and easy to understand so that other developers who are curious about exchange architecture can learn from it as well.
