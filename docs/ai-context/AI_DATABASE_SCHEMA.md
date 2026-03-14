# AI DATABASE SCHEMA
## Project: AgriNext Agricultural Coordination Platform

This document describes the canonical database schema for the platform.

All AI agents (Cursor, Claude, GPT, Copilot) must reference this document before creating models, migrations, queries, or services.

This schema supports:

• Farmers
• Agents
• Buyers
• Transport partners
• Vendors (fertilizer / seed / input suppliers)
• Logistics coordination
• Reverse logistics
• Agricultural data intelligence

---

# DATABASE ARCHITECTURE OVERVIEW

The database is organized into the following domains:

1. User & Identity Domain
2. Farm & Crop Domain
3. Marketplace Domain
4. Logistics Domain
5. Vendor / Input Supply Domain
6. Agent Verification Domain
7. Trip Execution Domain
8. Analytics & Monitoring Domain

All new tables must belong to one of these domains.

---

# 1 USER & IDENTITY DOMAIN

## users

Primary identity table.

| field | type | description |
|-----|-----|-------------|
id | uuid | primary key
phone_number | string | login identifier
name | string | full name
role | enum | farmer, agent, buyer, transporter, vendor, admin
created_at | timestamp |

---

## user_profiles

Extended user information.

| field | type |
|-----|-----|
id | uuid
user_id | uuid (FK users)
address | text
district | string
state | string
language | string
created_at | timestamp

---

# 2 FARM DOMAIN

## farms

Represents farmer land units.

| field | type |
|-----|-----|
id | uuid
farmer_id | uuid
farm_name | string
location_lat | float
location_lng | float
village | string
taluk | string
district | string
soil_type | string
area_acres | float
created_at | timestamp

---

## crops

Crop catalog.

| field | type |
|-----|-----|
id | uuid
name | string
category | string

---

## farm_crops

Crop grown on a specific farm.

| field | type |
|-----|-----|
id | uuid
farm_id | uuid
crop_id | uuid
sowing_date | date
expected_harvest_date | date
estimated_quantity | float
status | enum (growing, ready, harvested)

---

# 3 MARKETPLACE DOMAIN

## produce_listings

Farmer produce available for sale.

| field | type |
|-----|-----|
id | uuid
farmer_id | uuid
crop_id | uuid
quantity | float
price_expectation | decimal
harvest_ready_date | date
status | enum

---

## buyer_orders

Buyer purchase order.

| field | type |
|-----|-----|
id | uuid
buyer_id | uuid
listing_id | uuid
quantity | float
order_status | enum
created_at | timestamp

---

# 4 LOGISTICS DOMAIN

This domain is critical.

All logistics flows must use these entities.

Logistics must remain actor-agnostic.

---

## shipment_requests

Represents a request for transportation.

| field | type |
|-----|-----|
id | uuid
request_source_type | enum (farmer, buyer, vendor, admin)
source_actor_id | uuid
shipment_type | enum (farm_produce, agri_input, general_goods)
pickup_location | text
drop_location | text
pickup_time_window | timestamp
delivery_time_window | timestamp
weight_estimate | float
volume_estimate | float
status | enum
created_at | timestamp

---

## shipment_items

Items inside shipment.

| field | type |
|-----|-----|
id | uuid
shipment_id | uuid
product_name | string
category | string
quantity | float
unit | string
weight | float

---

## load_pools

Group of shipments combined into a shared load.

| field | type |
|-----|-----|
id | uuid
route_cluster | string
total_weight | float
capacity_used | float
status | enum

---

# 5 TRIP EXECUTION DOMAIN

## vehicles

Transport partner vehicles.

| field | type |
|-----|-----|
id | uuid
owner_id | uuid
vehicle_type | string
registration_number | string
capacity_weight | float
capacity_volume | float

---

## trips

Represents a vehicle trip.

| field | type |
|-----|-----|
id | uuid
vehicle_id | uuid
driver_id | uuid
start_location | text
end_location | text
trip_direction | enum (forward, return)
capacity_total | float
capacity_used | float
trip_status | enum

---

## trip_legs

Stops in trip.

| field | type |
|-----|-----|
id | uuid
trip_id | uuid
sequence_order | integer
pickup_location | text
drop_location | text
associated_shipment_id | uuid

---

## vehicle_capacity_blocks

Tracks remaining capacity.

| field | type |
|-----|-----|
id | uuid
trip_id | uuid
remaining_weight | float
remaining_volume | float

---

# 6 REVERSE LOGISTICS DOMAIN

Critical feature of platform.

---

## reverse_load_candidates

Represents potential return loads.

| field | type |
|-----|-----|
id | uuid
trip_id | uuid
route_cluster | string
available_capacity | float
candidate_score | float

---

## bookings

Assigns shipment to trip.

| field | type |
|-----|-----|
id | uuid
shipment_id | uuid
trip_id | uuid
booking_status | enum
confirmed_at | timestamp

---

# 7 VENDOR / INPUT SUPPLY DOMAIN

## vendors

Registered agricultural input suppliers.

| field | type |
|-----|-----|
id | uuid
user_id | uuid
business_name | string
district | string
service_area | text

---

## vendor_products

Products supplied by vendor.

| field | type |
|-----|-----|
id | uuid
vendor_id | uuid
product_name | string
category | string
price | decimal

---

## vendor_delivery_requests

Vendor delivery needs.

| field | type |
|-----|-----|
id | uuid
vendor_id | uuid
destination_cluster | string
product_category | string
quantity | float
delivery_window | timestamp
status | enum

---

# 8 AGENT DOMAIN

## agents

Field coordinators.

| field | type |
|-----|-----|
id | uuid
user_id | uuid
assigned_region | string

---

## agent_verifications

Agent verified farm data.

| field | type |
|-----|-----|
id | uuid
agent_id | uuid
farm_id | uuid
verification_type | string
verified_at | timestamp

---

# DATABASE RULES FOR AI AGENTS

AI agents must follow these constraints:

1. Never create duplicate shipment systems.
2. All logistics must use shipment_requests.
3. Never hardcode logistics to a single actor role.
4. Maintain backward compatibility with existing APIs.
5. Always introduce migrations for schema changes.
6. Avoid deleting tables with production data.

---

# LONG TERM SCALE TARGET

The schema should support:

• millions of farmers
• thousands of transport vehicles
• millions of shipments
• predictive logistics optimization

---

# IMPORTANT DESIGN PRINCIPLE

The platform is NOT a simple marketplace.

It is a coordination infrastructure connecting:

Farms → Markets → Logistics → Inputs → Storage

All database design must support this coordination model.
