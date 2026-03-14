# PLATFORM FIX TASK LIST

**Generated At:** 2026-03-13T18:06:20.602Z

**Total Failures:** 93

---

## Priority Tasks

### Backend / Database Failure

1. **[BACKEND]** Fix injecting env (8) from .env -- tip in `tests/smoke-test.ts`
   - Error: ⚙️  override existing env vars with { override: true }

2. **[BACKEND]** Fix injecting env (8) from .env -- tip in `unknown`
   - Error: ⚙️  load multiple .env files with { path: ['.env.local', '.env'] }

3. **[BACKEND]** Fix renders farmland cards with names and areas in `tests/farmer/farmlands.test.tsx`
   - Error: Error: Test timed out in 5000ms.

4. **[BACKEND]** Fix injecting env (8) from .env -- tip in `tests/agent/agent-system.test.ts`
   - Error: ⚙️  enable debug logging with { debug: true }

5. **[BACKEND]** Fix Read assigned farmer profile in `tests/agent/agent-system.test.ts`
   - Error: [object Object]
   - Hint: Check RLS on profiles — agent should read assigned farmer via is_agent_assigned

6. **[BACKEND]** Fix Seed farmland in `tests/agent/agent-system.test.ts`
   - Error: [object Object]
   - Hint: Check farmlands table schema and INSERT permissions for service_role

7. **[BACKEND]** Fix Read assigned farmer farmlands in `tests/agent/agent-system.test.ts`
   - Error: Agent cannot see assigned farmer's farmlands
   - Hint: Check RLS on farmlands — agent should see assigned farmer's farmlands via is_agent_assigned

8. **[BACKEND]** Fix Seed crop in `tests/agent/agent-system.test.ts`
   - Error: No farmland ID from previous step
   - Hint: Check crops table schema

9. **[BACKEND]** Fix Read assigned farmer crops in `tests/agent/agent-system.test.ts`
   - Error: Agent cannot see assigned farmer's crops
   - Hint: Check RLS on crops — agent should see assigned farmer's crops

10. **[BACKEND]** Fix Cannot see unassigned farmlands in `tests/agent/agent-system.test.ts`
   - Error: [object Object]
   - Hint: Check RLS on farmlands — agent should NOT see non-assigned farmer data

11. **[BACKEND]** Fix Fetch tasks list in `tests/agent/agent-system.test.ts`
   - Error: [object Object]
   - Hint: Check RLS SELECT on agent_tasks for agent role

12. **[BACKEND]** Fix Seed task (admin) in `tests/agent/agent-system.test.ts`
   - Error: [object Object]
   - Hint: Check agent_tasks INSERT schema

13. **[BACKEND]** Fix Read task details in `tests/agent/agent-system.test.ts`
   - Error: No seeded task ID
   - Hint: Check RLS SELECT on agent_tasks — agent should see own tasks

14. **[BACKEND]** Fix Agent creates task in `tests/agent/agent-system.test.ts`
   - Error: [object Object]
   - Hint: Check RLS INSERT on agent_tasks — agent should be able to create tasks

15. **[BACKEND]** Fix Status in `tests/agent/agent-system.test.ts`
   - Error: pending → in_progress: No task ID for status update
   - Hint: Check RLS UPDATE on agent_tasks — agent should update own task status

16. **[BACKEND]** Fix Status in `tests/agent/agent-system.test.ts`
   - Error: in_progress → completed: No task ID for completion
   - Hint: Check agent_tasks UPDATE for completion

17. **[BACKEND]** Fix Filter tasks by status in `tests/agent/agent-system.test.ts`
   - Error: [object Object]
   - Hint: Check that status filtering works on agent_tasks

18. **[BACKEND]** Fix Create visit (check-in) in `tests/agent/agent-system.test.ts`
   - Error: [object Object]
   - Hint: Check agent_visits table schema and INSERT permissions

19. **[BACKEND]** Fix Read visit details in `tests/agent/agent-system.test.ts`
   - Error: No visit ID from check-in step
   - Hint: Check RLS SELECT on agent_visits — agent should see own visits

20. **[BACKEND]** Fix In-progress state (no checkout) in `tests/agent/agent-system.test.ts`
   - Error: No visit ID
   - Hint: Visit in 'in_progress' status should have null checkout_time

21. **[BACKEND]** Fix Check-out visit in `tests/agent/agent-system.test.ts`
   - Error: No visit ID for checkout
   - Hint: Check RLS UPDATE on agent_visits — agent should update own visits

22. **[BACKEND]** Fix Fetch visits list in `tests/agent/agent-system.test.ts`
   - Error: [object Object]
   - Hint: Check RLS SELECT on agent_visits for full list query

23. **[BACKEND]** Fix Cannot see other agent visits in `tests/agent/agent-system.test.ts`
   - Error: [object Object]
   - Hint: Check RLS on agent_visits — agent should only see own visits

24. **[BACKEND]** Fix Cross-user isolation in `tests/agent/agent-system.test.ts`
   - Error: [object Object]
   - Hint: Check RLS on notifications — agent should NOT see other users' notifications

25. **[BACKEND]** Fix Read service areas in `tests/agent/agent-system.test.ts`
   - Error: [object Object]
   - Hint: Check RLS SELECT on service_areas — agent should read own areas

26. **[BACKEND]** Fix Create service area in `tests/agent/agent-system.test.ts`
   - Error: [object Object]
   - Hint: Check RLS INSERT on service_areas — agent should create own service areas

27. **[BACKEND]** Fix Delete service area in `tests/agent/agent-system.test.ts`
   - Error: No service area ID from previous step
   - Hint: Check RLS DELETE on service_areas — agent should delete own service areas

28. **[BACKEND]** Fix injecting env (8) from .env -- tip in `tests/logistics/logistics-system.test.ts`
   - Error: 🛡️ auth for agents: https://vestauth.com

29. **[BACKEND]** Fix Accept load in `tests/logistics/logistics-system.test.ts`
   - Error: [object Object]
   - Hint: Check transport_requests UPDATE policy and status transition

30. **[BACKEND]** Fix Filter requests by status in `tests/logistics/logistics-system.test.ts`
   - Error: Accepted request not found in assigned filter
   - Hint: Check status filter logic for transport_requests

31. **[BACKEND]** Fix Create trip from accepted load in `tests/logistics/logistics-system.test.ts`
   - Error: [object Object]
   - Hint: Check trips table INSERT policy and schema

32. **[BACKEND]** Fix Fetch trips for transporter in `tests/logistics/logistics-system.test.ts`
   - Error: No trips found for logistics user
   - Hint: Check trips SELECT policy for transporter_id filter

33. **[BACKEND]** Fix Fetch trip detail in `tests/logistics/logistics-system.test.ts`
   - Error: No trip ID from create step
   - Hint: Check trips SELECT with detail columns

34. **[BACKEND]** Fix Trip status events in `tests/logistics/logistics-system.test.ts`
   - Error: Missing trip or request ID
   - Hint: Check transport_status_events table and INSERT/SELECT policies

35. **[BACKEND]** Fix Fetch active trips in `tests/logistics/logistics-system.test.ts`
   - Error: No active trips found for logistics user
   - Hint: Check trips SELECT with IN filter for active statuses

36. **[BACKEND]** Fix Transition accepted -> pickup_done in `tests/logistics/logistics-system.test.ts`
   - Error: No trip ID from upstream test
   - Hint: Check trips UPDATE policy for status transition

37. **[BACKEND]** Fix Transition pickup_done -> in_transit in `tests/logistics/logistics-system.test.ts`
   - Error: No trip ID
   - Hint: Check trips UPDATE for in_transit transition

38. **[BACKEND]** Fix Transition in_transit -> delivered in `tests/logistics/logistics-system.test.ts`
   - Error: No trip ID
   - Hint: Check trips UPDATE for delivered transition

39. **[BACKEND]** Fix Full status event timeline in `tests/logistics/logistics-system.test.ts`
   - Error: No trip ID
   - Hint: Check transport_status_events completeness

40. **[BACKEND]** Fix Fetch completed trips in `tests/logistics/logistics-system.test.ts`
   - Error: No completed trips found — trip lifecycle may not have completed
   - Hint: Check trips SELECT with IN filter for delivered/completed statuses

41. **[BACKEND]** Fix Completed trip data integrity in `tests/logistics/logistics-system.test.ts`
   - Error: No trip ID from upstream test
   - Hint: Check trip lifecycle timestamp population

42. **[BACKEND]** Fix Completed trip detail accessible in `tests/logistics/logistics-system.test.ts`
   - Error: No trip ID
   - Hint: Check trip + transport_request join access after completion

43. **[BACKEND]** Fix Trip detail with farmer context in `tests/logistics/logistics-system.test.ts`
   - Error: No trip ID from upstream test
   - Hint: Check trip -> transport_request -> profile join path

44. **[BACKEND]** Fix Status events timeline in `tests/logistics/logistics-system.test.ts`
   - Error: No trip ID
   - Hint: Check transport_status_events ordering and completeness

45. **[BACKEND]** Fix Proof fields on trip in `tests/logistics/logistics-system.test.ts`
   - Error: No trip ID
   - Hint: Check trips pickup_proofs/delivery_proofs columns (JSONB array)

46. **[BACKEND]** Fix injecting env (8) from .env -- tip in `tests/admin/admin-system.test.ts`
   - Error: 🔐 prevent building .env in docker: https://dotenvx.com/prebuild

47. **[BACKEND]** Fix Fetch profiles in `tests/admin/admin-system.test.ts`
   - Error: [object Object]
   - Hint: Check admin RLS read access to profiles table

48. **[BACKEND]** Fix Record shape in `tests/admin/admin-system.test.ts`
   - Error: [object Object]
   - Hint: Check profiles table schema has id, full_name, phone, district columns

49. **[BACKEND]** Fix Search by name in `tests/admin/admin-system.test.ts`
   - Error: [object Object]
   - Hint: Check admin can query profiles with ILIKE filter

50. **[BACKEND]** Fix Pagination in `tests/admin/admin-system.test.ts`
   - Error: [object Object]
   - Hint: Check that profiles table supports range-based pagination

51. **[BACKEND]** Fix Query farmer profiles in `tests/admin/admin-system.test.ts`
   - Error: [object Object]
   - Hint: Check admin read access to profiles + user_roles for farmer filtering

52. **[BACKEND]** Fix View farmlands in `tests/admin/admin-system.test.ts`
   - Error: [object Object]
   - Hint: Check admin RLS read access to farmlands table

53. **[BACKEND]** Fix View crops in `tests/admin/admin-system.test.ts`
   - Error: No crops visible for farmer
   - Hint: Check admin RLS read access to crops table

54. **[BACKEND]** Fix View listings in `tests/admin/admin-system.test.ts`
   - Error: [object Object]
   - Hint: Check admin RLS read access to listings table

55. **[BACKEND]** Fix Query agent profiles in `tests/admin/admin-system.test.ts`
   - Error: [object Object]
   - Hint: Check admin read access to profiles + user_roles for agent filtering

56. **[BACKEND]** Fix View tasks in `tests/admin/admin-system.test.ts`
   - Error: [object Object]
   - Hint: Check admin RLS read access to agent_tasks table

57. **[BACKEND]** Fix View activity logs in `tests/admin/admin-system.test.ts`
   - Error: [object Object]
   - Hint: Check admin RLS read access to agent_activity_logs table

58. **[BACKEND]** Fix View buyer profile in `tests/admin/admin-system.test.ts`
   - Error: [object Object]
   - Hint: Check admin RLS read access to profiles for buyer user

59. **[BACKEND]** Fix View buyer orders in `tests/admin/admin-system.test.ts`
   - Error: [object Object]
   - Hint: Check admin RLS read access to market_orders table

60. **[BACKEND]** Fix View transport requests in `tests/admin/admin-system.test.ts`
   - Error: [object Object]
   - Hint: Check admin RLS read access to transport_requests table

61. **[BACKEND]** Fix Fetch orders in `tests/admin/admin-system.test.ts`
   - Error: [object Object]
   - Hint: Check admin RLS read access to market_orders table

62. **[BACKEND]** Fix Order details in `tests/admin/admin-system.test.ts`
   - Error: No order seeded — skipping detail check
   - Hint: Check market_orders schema and admin read access

63. **[BACKEND]** Fix Update order status in `tests/admin/admin-system.test.ts`
   - Error: No order seeded — skipping status update
   - Hint: Check admin write access to market_orders status column

64. **[BACKEND]** Fix Order associations in `tests/admin/admin-system.test.ts`
   - Error: No order seeded — skipping association check
   - Hint: Check admin can join market_orders to profiles via buyer_id/farmer_id

65. **[BACKEND]** Fix Fetch transport requests in `tests/admin/admin-system.test.ts`
   - Error: [object Object]
   - Hint: Check admin RLS read access to transport_requests table

66. **[BACKEND]** Fix Update transport status in `tests/admin/admin-system.test.ts`
   - Error: No transport request seeded
   - Hint: Check admin write access to transport_requests status column

67. **[BACKEND]** Fix Trip-request link in `tests/admin/admin-system.test.ts`
   - Error: No trip/transport seeded — skipping link check
   - Hint: Check trips.transport_request_id FK and admin read access

68. **[BACKEND]** Fix List tickets RPC in `tests/admin/admin-system.test.ts`
   - Error: [object Object]
   - Hint: Check admin.list_tickets_v1 RPC exists and admin has EXECUTE permission

69. **[BACKEND]** Fix Seed ticket in `tests/admin/admin-system.test.ts`
   - Error: [object Object]
   - Hint: Check support_tickets table schema and admin insert access

70. **[BACKEND]** Fix Update ticket status in `tests/admin/admin-system.test.ts`
   - Error: No ticket seeded — skipping status update
   - Hint: Check admin.update_ticket_status_v2 RPC and admin execute permission

71. **[BACKEND]** Fix Assign ticket in `tests/admin/admin-system.test.ts`
   - Error: No ticket seeded — skipping assign
   - Hint: Check admin.assign_ticket_v1 RPC and admin_users record exists

72. **[BACKEND]** Fix Filter tickets by status in `tests/admin/admin-system.test.ts`
   - Error: [object Object]
   - Hint: Check admin.list_tickets_v1 supports status filter

73. **[BACKEND]** Fix Ops inbox RPC callable in `tests/admin/admin-system.test.ts`
   - Error: [object Object]
   - Hint: Check admin.get_ops_inbox_v1 RPC exists and admin has EXECUTE permission

74. **[BACKEND]** Fix Response shape in `tests/admin/admin-system.test.ts`
   - Error: [object Object]
   - Hint: Check admin.get_ops_inbox_v1 returns {items: [], next_cursor: ...} shape

75. **[BACKEND]** Fix Seed pending updates in `tests/admin/admin-system.test.ts`
   - Error: [object Object]
   - Hint: Check agent_tasks insert with task_type=update

76. **[BACKEND]** Fix Approve update in `tests/admin/admin-system.test.ts`
   - Error: No approve task seeded
   - Hint: Check admin can update agent_tasks status to 'approved'

77. **[BACKEND]** Fix Reject update in `tests/admin/admin-system.test.ts`
   - Error: No reject task seeded
   - Hint: Check admin can update agent_tasks status to 'rejected'

78. **[BACKEND]** Fix Cross-table counts in `tests/admin/admin-system.test.ts`
   - Error: Count queries failed: 
   - Hint: Check admin has count access to profiles, crops, listings, market_orders, transport_requests

79. **[BACKEND]** Fix User-role consistency in `tests/admin/admin-system.test.ts`
   - Error: [object Object]
   - Hint: Check admin read access to profiles and user_roles for consistency check

80. **[BACKEND]** Fix Time-windowed stats in `tests/admin/admin-system.test.ts`
   - Error: [object Object]
   - Hint: Check admin can query profiles and market_orders with created_at filter

81. **[BACKEND]** Fix injecting env (8) from .env -- tip in `unknown`
   - Error: ⚙️  specify custom .env file path with { path: '/custom/path/.env' }

82. **[BACKEND]** Fix Module-level error in `tests/chaos/concurrency-collision.test.ts`
   - Error: ctx.adminClient.from(...).update(...).eq(...).catch is not a function
   - Hint: Unhandled error in Concurrency Collision module

### Role Permission / RLS Failure

83. **[ROLE_PERMISSION]** Fix CANNOT read unassigned farmlands in `tests/agent/agent-system.test.ts`
   - Error: [object Object]
   - Hint: RLS on farmlands must restrict agent to assigned farmers only

84. **[ROLE_PERMISSION]** Fix CAN read all profiles in `tests/admin/admin-system.test.ts`
   - Error: Admin sees only 0 profiles, expected at least 5
   - Hint: Admin RLS should grant read access to all profiles

85. **[ROLE_PERMISSION]** Fix CAN read admin_users in `tests/admin/admin-system.test.ts`
   - Error: Admin cannot read own admin_users row
   - Hint: Admin RLS should grant read access to admin_users

86. **[ROLE_PERMISSION]** Fix CAN read notifications in `tests/admin/admin-system.test.ts`
   - Error: [object Object]
   - Hint: Admin RLS should grant read access to notifications

### UI / Workflow Failure

87. **[UI_WORKFLOW]** Fix Create trip in `tests/logistics-tests.ts`
   - Error: [object Object]
   - Hint: Check trips table schema and permissions

88. **[UI_WORKFLOW]** Fix Update trip in `tests/logistics-tests.ts`
   - Error: No trip ID from previous step
   - Hint: Check trips UPDATE policy

89. **[UI_WORKFLOW]** Fix Fetch assigned trips in `tests/logistics-tests.ts`
   - Error: No trips found for logistics user
   - Hint: Check trips RLS SELECT policy for logistics role

90. **[UI_WORKFLOW]** Fix Dashboard reflects assignment in `tests/agent/agent-system.test.ts`
   - Error: Expected at least 1 assigned farmer, got 0
   - Hint: Check agent_dashboard_v1 counts after seeding an assignment

91. **[UI_WORKFLOW]** Fix Dashboard reflects tasks in `tests/agent/agent-system.test.ts`
   - Error: [object Object]
   - Hint: Check agent_dashboard_v1 task counts after seeding a task

92. **[UI_WORKFLOW]** Fix Direct task query in `tests/agent/agent-system.test.ts`
   - Error: [object Object]
   - Hint: Check RLS SELECT policy on agent_tasks for agent role

93. **[UI_WORKFLOW]** Fix Dashboard reflects seeded data in `tests/admin/admin-system.test.ts`
   - Error: [object Object]
   - Hint: Check admin_dashboard_v1 counts after seeding farmland/crop/listing

---

*Task list generated by AgriNext Gen Failure Analysis System at 2026-03-13T18:06:20.602Z*
