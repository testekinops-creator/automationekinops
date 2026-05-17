# RMA Locators Reference

## LoginPage

| Type | Label/Name | ID | CSS Selector | XPath |
|---|---|---|---|---|
| input[type=text] | email | email | `#email` | `//*[@id="email"]` |
| input[type=password] | password | password | `#password` | `//*[@id="password"]` |
| button | Sign In |  | `button[name="commit"]` | `//button[@name="commit"]` |
| a | Sign in with Microsoft |  | `a` | `//a` |

## Dashboard

| Type | Label/Name | ID | CSS Selector | XPath |
|---|---|---|---|---|
| button[type=button] | (no label) | navbar-toggler | `#navbar-toggler` | `//*[@id="navbar-toggler"]` |
| button[type=button] | (no label) | navbar-toggler | `#navbar-toggler` | `//*[@id="navbar-toggler"]` |
| button | (no label) | sidebarToggleTop | `#sidebarToggleTop` | `//*[@id="sidebarToggleTop"]` |
| button | (no label) | sidebarToggle | `#sidebarToggle` | `//*[@id="sidebarToggle"]` |

## SubmitRMA

| Type | Label/Name | ID | CSS Selector | XPath |
|---|---|---|---|---|
| button[type=button] | (no label) | navbar-toggler | `#navbar-toggler` | `//*[@id="navbar-toggler"]` |
| button[type=button] | (no label) | navbar-toggler | `#navbar-toggler` | `//*[@id="navbar-toggler"]` |
| button | (no label) | sidebarToggleTop | `#sidebarToggleTop` | `//*[@id="sidebarToggleTop"]` |
| button | (no label) | sidebarToggle | `#sidebarToggle` | `//*[@id="sidebarToggle"]` |
| select | customer_id | customer_id | `#customer_id` | `//*[@id="customer_id"]` |
| select | user_id | user_id | `#user_id` | `//*[@id="user_id"]` |
| input[type=text] | phone_no | phone_no | `#phone_no` | `//*[@id="phone_no"]` |
| input[type=email] | email | email | `#email` | `//*[@id="email"]` |
| select | return_location_id | return_location_id | `#return_location_id` | `//*[@id="return_location_id"]` |
| input[type=text] | customer_internal_reference | customer_internal_reference | `#customer_internal_reference` | `//*[@id="customer_internal_reference"]` |
| input[type=text] | serial_number | serial_number | `#serial_number` | `//*[@id="serial_number"]` |
| select | rma_type | rma_type | `#rma_type` | `//*[@id="rma_type"]` |
| input[type=text] | product_name | product_name | `#product_name` | `//*[@id="product_name"]` |
| input[type=text] | product_code | product_code | `#product_code` | `//*[@id="product_code"]` |
| textarea | comment |  | `textarea[name="comment"]` | `//textarea[@name="comment"]` |
| button | Save | submitBtn | `#submitBtn` | `//*[@id="submitBtn"]` |
| a | Close |  | `a` | `//a` |

## ViewRMA

| Type | Label/Name | ID | CSS Selector | XPath |
|---|---|---|---|---|
| button[type=button] | (no label) | navbar-toggler | `#navbar-toggler` | `//*[@id="navbar-toggler"]` |
| button[type=button] | (no label) | navbar-toggler | `#navbar-toggler` | `//*[@id="navbar-toggler"]` |
| button | (no label) | sidebarToggleTop | `#sidebarToggleTop` | `//*[@id="sidebarToggleTop"]` |
| button | (no label) | sidebarToggle | `#sidebarToggle` | `//*[@id="sidebarToggle"]` |
| a | Submit RMA Request |  | `a` | `//a` |
| a | Export To Excel |  | `a` | `//a` |
| a | Filter Data |  | `a` | `//a` |
| input[type=text] | rma_id | rma_id | `#rma_id` | `//*[@id="rma_id"]` |
| textarea | serial_number | serial_number | `#serial_number` | `//*[@id="serial_number"]` |
| select | status_id[] |  | `select[name="status_id[]"]` | `//select[@name="status_id[]"]` |
| input[type=search] | (no label) |  | `input` | `//input` |
| select | customer_id[] |  | `select[name="customer_id[]"]` | `//select[@name="customer_id[]"]` |
| input[type=search] | (no label) |  | `input` | `//input` |
| select | show_only |  | `select[name="show_only"]` | `//select[@name="show_only"]` |
| input[type=text] | keyword |  | `input[name="keyword"]` | `//input[@name="keyword"]` |
| button | Apply | filterSubmit | `#filterSubmit` | `//*[@id="filterSubmit"]` |
| input[type=button] | reset |  | `input[name="reset"]` | `//input[@name="reset"]` |
| input[type=button] | gridFilterClose | gridFilterClose | `#gridFilterClose` | `//*[@id="gridFilterClose"]` |

## FactoryInsert

| Type | Label/Name | ID | CSS Selector | XPath |
|---|---|---|---|---|
| button[type=button] | (no label) | navbar-toggler | `#navbar-toggler` | `//*[@id="navbar-toggler"]` |
| button[type=button] | (no label) | navbar-toggler | `#navbar-toggler` | `//*[@id="navbar-toggler"]` |
| button | (no label) | sidebarToggleTop | `#sidebarToggleTop` | `//*[@id="sidebarToggleTop"]` |
| button | (no label) | sidebarToggle | `#sidebarToggle` | `//*[@id="sidebarToggle"]` |
| select | customer_id | customer_id | `#customer_id` | `//*[@id="customer_id"]` |
| select | user_id | user_id | `#user_id` | `//*[@id="user_id"]` |
| select | return_location_id | return_location_id | `#return_location_id` | `//*[@id="return_location_id"]` |
| input[type=text] | serial_number | serial_number | `#serial_number` | `//*[@id="serial_number"]` |
| select | rma_type | rma_type | `#rma_type` | `//*[@id="rma_type"]` |
| input[type=text] | product_code | product_code | `#product_code` | `//*[@id="product_code"]` |
| input[type=text] | product_name | product_name | `#product_name` | `//*[@id="product_name"]` |
| textarea | repair_note |  | `textarea[name="repair_note"]` | `//textarea[@name="repair_note"]` |
| input[type=checkbox] | send_email_to_customer |  | `input[name="send_email_to_customer"]` | `//input[@name="send_email_to_customer"]` |
| button[type=submit] | Submit | submitBtnFactory | `#submitBtnFactory` | `//*[@id="submitBtnFactory"]` |
| a | Cancel |  | `a` | `//a` |

## FactoryReceive

| Type | Label/Name | ID | CSS Selector | XPath |
|---|---|---|---|---|
| button[type=button] | (no label) | navbar-toggler | `#navbar-toggler` | `//*[@id="navbar-toggler"]` |
| button[type=button] | (no label) | navbar-toggler | `#navbar-toggler` | `//*[@id="navbar-toggler"]` |
| button | (no label) | sidebarToggleTop | `#sidebarToggleTop` | `//*[@id="sidebarToggleTop"]` |
| button | (no label) | sidebarToggle | `#sidebarToggle` | `//*[@id="sidebarToggle"]` |
| input[type=text] | serial_number[] |  | `input[name="serial_number[]"]` | `//input[@name="serial_number[]"]` |
| input[type=text] | product_name[] |  | `input[name="product_name[]"]` | `//input[@name="product_name[]"]` |
| input[type=text] | product_code[] |  | `input[name="product_code[]"]` | `//input[@name="product_code[]"]` |
| select | rma_id[] |  | `select[name="rma_id[]"]` | `//select[@name="rma_id[]"]` |
| button[type=button] | Add Row | factory-receive-add-row | `#factory-receive-add-row` | `//*[@id="factory-receive-add-row"]` |
| input[type=checkbox] | Send E-Mail To Customer | send_email_to_customer | `#send_email_to_customer` | `//*[@id="send_email_to_customer"]` |
| input[type=text] | serial_number[] |  | `input[name="serial_number[]"]` | `//input[@name="serial_number[]"]` |
| input[type=text] | product_name[] |  | `input[name="product_name[]"]` | `//input[@name="product_name[]"]` |
| input[type=text] | product_code[] |  | `input[name="product_code[]"]` | `//input[@name="product_code[]"]` |
| select | rma_id[] |  | `select[name="rma_id[]"]` | `//select[@name="rma_id[]"]` |
| button[type=submit] | Submit |  | `button[name="submitForm"]` | `//button[@name="submitForm"]` |
| a | Cancel |  | `a` | `//a` |

