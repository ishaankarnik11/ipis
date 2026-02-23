
📊 Internal Profitability Intelligence System (IPIS)
One-Page Project Brief
🎯 Objective
Build an internal web-based application that calculates and visualizes:
•	Employee-wise profitability
•	Project-wise profitability
•	Department-wise profitability
•	Client-wise profitability
•	Company-level gross margin
The system will derive insights using:
1.	Annual Employee Salary Data (Excel upload – yearly)
2.	Monthly Timesheets (Excel upload – monthly)
3.	Monthly Revenue/Sales Data (Excel upload – monthly)
________________________________________
🧩 Project Types to Support
The system must support margin calculation for:
•	T&M (Time & Material)
•	Fixed Cost Projects
•	Infrastructure Billing
•	AMC (Annual Maintenance Contract)
Each project type must have a different revenue-cost logic model.
________________________________________
📥 Input Data (Excel-Based)
1️⃣ Employee Master (Yearly Upload)
•	Employee ID
•	Department
•	Designation
•	Annual CTC (incl. benefits)
•	Billable / Non-Billable
•	Joining Date
________________________________________
2️⃣ Monthly Timesheet
•	Employee ID
•	Project ID
•	Billable Hours
•	Non-Billable Hours
•	Month
________________________________________
3️⃣ Revenue / Billing Data
•	Project ID
•	Client Name
•	Invoice Amount
•	Invoice Date
•	Project Type (T&M / Fixed / Infra / AMC)
•	Vertical (Municipal / Enterprise / AI etc.)
________________________________________
⚙️ Core Calculation Logic
🔹 Employee Cost Per Hour
Annual Cost (Actual CTC + 180000 Overhead cost per year) ÷ 12 ÷ Standard Working Hours (Configurable, default 160 hrs)
________________________________________
🔹 Profitability Logic by Project Type
T&M
Revenue = Billed hours × Billing Rate
Cost = Employee Cost × Project Hours
Profit = Revenue – Cost
________________________________________
Fixed Cost
Revenue = Fixed Contract Value
Cost = Sum(Employee Cost × Total Project Hours)
Profit = Revenue – Actual Cost
________________________________________
Infrastructure Billing
Revenue = Infra Invoice
Cost = Actual infra vendor cost + manpower allocation
Profit = Revenue – Cost
________________________________________
AMC
Revenue = AMC Contract Value
Cost = Support hours × Cost per hour
Profit = Revenue – Cost
________________________________________
📊 Required Dashboards
Executive Dashboard
•	Total Revenue (Monthly / YTD)
•	Total Cost
•	Gross Margin %
•	Utilization %
•	Top 5 Profitable Projects
•	Bottom 5 Projects
________________________________________
Employee Dashboard
•	Billable %
•	Revenue Contribution
•	Cost
•	Profit
•	Profitability Rank
________________________________________
Project Dashboard
•	Revenue vs Cost
•	Margin %
•	Budget vs Actual (for Fixed Projects)
•	Burn Rate
________________________________________
Department Dashboard
•	Revenue
•	Cost
•	Utilization %
•	Profit %
•	Comparison by month
________________________________________
🔐 User Roles
•	Admin (Full access)
•	Finance (Revenue & Cost)
•	Delivery Manager (Project-level)
•	Department Head (Dept view)
•	HR (Salary + Utilization)
________________________________________
🛠 Technical Direction
Preferred Stack:
•	Backend: Your Choice
•	Frontend: React
•	Database: PostgreSQL
•	Hosting: AWS
•	Role-based Access Control
________________________________________
📈 Expected Outcomes
•	Identify underpriced projects
•	Detect low-utilization employees
•	Understand margin by vertical 
•	Improve future proposal pricing
•	Enable data-driven hiring decisions
•	Reduce hidden losses
