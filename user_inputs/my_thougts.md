IPIS application user inputs

Pending approval on side bar is in back on blue background, this is looking bad.
When I all a new department it does not show up in department dashboard
I think there is lack of fundamental understanding, project role is from departments since people work in department
We have created role and department it should be consolidated.
On employee view there is no view user details in full page. On this page we should show that employees details and all the projects he is working on. And link to those projects. What is the percentage of that employees time is allocated to that project.

Download templet does not work on upload central
In grig below, there is no option to view what exactly was uploaded, there should be a way to view uploaded records, and see success and failed upload, and download those as files, in fail file there should be a remark column with reason. 

Share link on all dashboards when opened is not showing proper page rather a json which is wrong, we need to create a good looking screen.

I see that employee dashboard has what I was talking about, its almost same as employee screen, we don’t need two, lets keep only emp dashboard and have all imp cta for emp screen there. 

I feel we have overengeenered the user roles and created confusion	who has access to what let me put original request here again 


📊 Internal Profitability Intelligence System (IPIS)
One-Page Project Brief
🎯 Objective
Build an internal web-based application that calculates and visualizes:
* Employee-wise profitability
* Project-wise profitability
* Department-wise profitability
* Client-wise profitability
* Company-level gross margin
The system will derive insights using:
1. Annual Employee Salary Data (Excel upload – yearly)
2. Monthly Timesheets (Excel upload – monthly)
3. Monthly Revenue/Sales Data (Excel upload – monthly)
￼
🧩 Project Types to Support
The system must support margin calculation for:
* T&M (Time & Material)
* Fixed Cost Projects
* Infrastructure Billing
* AMC (Annual Maintenance Contract)
Each project type must have a different revenue-cost logic model.
￼
📥 Input Data (Excel-Based)
1️⃣ Employee Master (Yearly Upload)
* Employee ID
* Department
* Designation
* Annual CTC (incl. benefits)
* Billable / Non-Billable
* Joining Date
￼
2️⃣ Monthly Timesheet
* Employee ID
* Project ID
* Billable Hours
* Non-Billable Hours
* Month
￼
3️⃣ Revenue / Billing Data
* Project ID
* Client Name
* Invoice Amount
* Invoice Date
* Project Type (T&M / Fixed / Infra / AMC)
* Vertical (Municipal / Enterprise / AI etc.)
￼
⚙️ Core Calculation Logic
🔹 Employee Cost Per Hour
Annual Cost (Actual CTC + 180000 Overhead cost per year) ÷ 12 ÷ Standard Working Hours (Configurable, default 160 hrs)
￼
🔹 Profitability Logic by Project Type
T&MRevenue = Billed hours × Billing RateCost = Employee Cost × Project HoursProfit = Revenue – Cost
￼
Fixed CostRevenue = Fixed Contract ValueCost = Sum(Employee Cost × Total Project Hours)Profit = Revenue – Actual Cost
￼
Infrastructure BillingRevenue = Infra InvoiceCost = Actual infra vendor cost + manpower allocationProfit = Revenue – Cost
￼
AMCRevenue = AMC Contract ValueCost = Support hours × Cost per hourProfit = Revenue – Cost
￼
📊 Required Dashboards
Executive Dashboard
* Total Revenue (Monthly / YTD)
* Total Cost
* Gross Margin %
* Utilization %
* Top 5 Profitable Projects
* Bottom 5 Projects
￼
Employee Dashboard
* Billable %
* Revenue Contribution
* Cost
* Profit
* Profitability Rank
￼
Project Dashboard
* Revenue vs Cost
* Margin %
* Budget vs Actual (for Fixed Projects)
* Burn Rate
￼
Department Dashboard
* Revenue
* Cost
* Utilization %
* Profit %
* Comparison by month
￼
🔐 User Roles
* Admin (Full access)
* Finance (Revenue & Cost)
* Delivery Manager (Project-level)
* Department Head (Dept view)
* HR (Salary + Utilization)
￼
🛠 Technical Direction
Preferred Stack:
* Backend: Your Choice
* Frontend: React
* Database: PostgreSQL
* Hosting: AWS
* Role-based Access Control
￼
📈 Expected Outcomes
* Identify underpriced projects
* Detect low-utilization employees
* Understand margin by vertical 
* Improve future proposal pricing
* Enable data-driven hiring decisions
* Reduce hidden losses

I have attached the sample excel file accounting team will upload in system per month for revenue monthly data, 

Similarly create excel for emp master and monthly timesheet

Revenu cost profit are blank on project view for all projects


