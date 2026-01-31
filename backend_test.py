#!/usr/bin/env python3
"""
Backend API Testing for Order Management System
Tests all backend APIs including products, parties, orders, material transactions, and financial transactions.
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend/.env
BASE_URL = "https://tradetracker-58.preview.emergentagent.com/api"

class BackendTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.test_results = []
        self.party_id = None
        self.product_ids = {}
        self.order_ids = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "details": details
        })
    
    def make_request(self, method, endpoint, data=None, params=None):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        try:
            if method.upper() == "GET":
                response = self.session.get(url, params=params)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data)
            elif method.upper() == "PATCH":
                response = self.session.patch(url, json=data)
            elif method.upper() == "DELETE":
                response = self.session.delete(url)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
        except requests.exceptions.RequestException as e:
            return None
    
    def test_products_api(self):
        """Test Products API - should return 3 products X, Y, Z"""
        print("\n=== Testing Products API ===")
        
        # Test GET /api/products
        response = self.make_request("GET", "/products")
        if not response:
            self.log_result("Products API", False, "Failed to connect to products endpoint")
            return False
        
        if response.status_code != 200:
            self.log_result("Products API", False, f"HTTP {response.status_code}", response.text)
            return False
        
        try:
            products = response.json()
            if not isinstance(products, list):
                self.log_result("Products API", False, "Response is not a list")
                return False
            
            if len(products) < 3:
                self.log_result("Products API", False, f"Expected at least 3 products, got {len(products)}")
                return False
            
            # Store product IDs for later use
            for product in products:
                if 'name' in product and 'id' in product:
                    self.product_ids[product['name']] = product['id']
            
            expected_products = ['Product X', 'Product Y', 'Product Z']
            found_products = [p['name'] for p in products if p['name'] in expected_products]
            
            # Also store simplified names for easier access
            for product in products:
                if product['name'] == 'Product X':
                    self.product_ids['X'] = product['id']
                elif product['name'] == 'Product Y':
                    self.product_ids['Y'] = product['id']
                elif product['name'] == 'Product Z':
                    self.product_ids['Z'] = product['id']
            
            if len(found_products) >= 3:
                self.log_result("Products API", True, f"Found {len(products)} products including X, Y, Z")
                return True
            else:
                self.log_result("Products API", False, f"Missing expected products. Found: {found_products}")
                return False
                
        except json.JSONDecodeError:
            self.log_result("Products API", False, "Invalid JSON response")
            return False
    
    def test_parties_api(self):
        """Test Parties API - should return Party P1 with balance 0"""
        print("\n=== Testing Parties API ===")
        
        # Test GET /api/parties
        response = self.make_request("GET", "/parties")
        if not response:
            self.log_result("Parties API", False, "Failed to connect to parties endpoint")
            return False
        
        if response.status_code != 200:
            self.log_result("Parties API", False, f"HTTP {response.status_code}", response.text)
            return False
        
        try:
            parties = response.json()
            if not isinstance(parties, list):
                self.log_result("Parties API", False, "Response is not a list")
                return False
            
            # Look for Party P1
            p1_party = None
            for party in parties:
                if party.get('name') == 'Party P1':
                    p1_party = party
                    self.party_id = party['id']
                    break
            
            if not p1_party:
                self.log_result("Parties API", False, "Party P1 not found")
                return False
            
            if p1_party.get('balance', -1) == 0.0:
                self.log_result("Parties API", True, f"Found Party P1 with balance 0")
                return True
            else:
                self.log_result("Parties API", False, f"Party P1 balance is {p1_party.get('balance')}, expected 0")
                return False
                
        except json.JSONDecodeError:
            self.log_result("Parties API", False, "Invalid JSON response")
            return False
    
    def test_create_sale_order(self):
        """Test creating a sale order for Party P1 with products X and Y"""
        print("\n=== Testing Sale Order Creation ===")
        
        if not self.party_id:
            self.log_result("Sale Order Creation", False, "No party ID available")
            return False
        
        if 'X' not in self.product_ids or 'Y' not in self.product_ids:
            self.log_result("Sale Order Creation", False, "Products X or Y not available")
            return False
        
        # Create sale order
        order_data = {
            "party_id": self.party_id,
            "order_type": "sale",
            "products": [
                {
                    "product_id": self.product_ids['X'],
                    "product_name": "X",
                    "quantity": 2.0,
                    "price": 100.0,
                    "weight": 1.0
                },
                {
                    "product_id": self.product_ids['Y'],
                    "product_name": "Y", 
                    "quantity": 1.0,
                    "price": 150.0,
                    "weight": 2.0
                }
            ]
        }
        
        response = self.make_request("POST", "/orders", order_data)
        if not response:
            self.log_result("Sale Order Creation", False, "Failed to connect to orders endpoint")
            return False
        
        if response.status_code != 200:
            self.log_result("Sale Order Creation", False, f"HTTP {response.status_code}", response.text)
            return False
        
        try:
            order = response.json()
            
            # Verify order structure
            required_fields = ['id', 'total_price', 'total_weight', 'status', 'priority']
            missing_fields = [field for field in required_fields if field not in order]
            
            if missing_fields:
                self.log_result("Sale Order Creation", False, f"Missing fields: {missing_fields}")
                return False
            
            # Verify calculations
            expected_total_price = 2.0 * 100.0 + 1.0 * 150.0  # 350.0
            expected_total_weight = 2.0 * 1.0 + 1.0 * 2.0     # 4.0
            
            if order['total_price'] != expected_total_price:
                self.log_result("Sale Order Creation", False, f"Wrong total_price: {order['total_price']}, expected {expected_total_price}")
                return False
            
            if order['total_weight'] != expected_total_weight:
                self.log_result("Sale Order Creation", False, f"Wrong total_weight: {order['total_weight']}, expected {expected_total_weight}")
                return False
            
            if order['status'] != 'start':
                self.log_result("Sale Order Creation", False, f"Wrong status: {order['status']}, expected 'start'")
                return False
            
            self.order_ids.append(order['id'])
            self.log_result("Sale Order Creation", True, f"Created sale order with total_price={order['total_price']}, total_weight={order['total_weight']}, status={order['status']}, priority={order['priority']}")
            return True
            
        except json.JSONDecodeError:
            self.log_result("Sale Order Creation", False, "Invalid JSON response")
            return False
    
    def test_material_transaction_auto_creation(self):
        """Test that material transaction was auto-created for the sale order"""
        print("\n=== Testing Material Transaction Auto-Creation ===")
        
        if not self.party_id:
            self.log_result("Material Transaction Auto-Creation", False, "No party ID available")
            return False
        
        # Get material transactions for the party
        response = self.make_request("GET", "/material-transactions", params={"party_id": self.party_id})
        if not response:
            self.log_result("Material Transaction Auto-Creation", False, "Failed to connect to material-transactions endpoint")
            return False
        
        if response.status_code != 200:
            self.log_result("Material Transaction Auto-Creation", False, f"HTTP {response.status_code}", response.text)
            return False
        
        try:
            transactions = response.json()
            if not isinstance(transactions, list):
                self.log_result("Material Transaction Auto-Creation", False, "Response is not a list")
                return False
            
            # Look for sale transaction with positive amount
            sale_transaction = None
            for transaction in transactions:
                if transaction.get('order_type') == 'sale' and transaction.get('amount', 0) > 0:
                    sale_transaction = transaction
                    break
            
            if not sale_transaction:
                self.log_result("Material Transaction Auto-Creation", False, "No positive sale material transaction found")
                return False
            
            # Verify amount is positive (350.0 from sale order)
            expected_amount = 350.0
            if sale_transaction['amount'] != expected_amount:
                self.log_result("Material Transaction Auto-Creation", False, f"Wrong amount: {sale_transaction['amount']}, expected {expected_amount}")
                return False
            
            self.log_result("Material Transaction Auto-Creation", True, f"Material transaction auto-created with amount={sale_transaction['amount']}")
            return True
            
        except json.JSONDecodeError:
            self.log_result("Material Transaction Auto-Creation", False, "Invalid JSON response")
            return False
    
    def test_party_balance_update(self):
        """Test that party balance was updated correctly after sale order"""
        print("\n=== Testing Party Balance Update ===")
        
        if not self.party_id:
            self.log_result("Party Balance Update", False, "No party ID available")
            return False
        
        # Get updated party details
        response = self.make_request("GET", f"/parties/{self.party_id}")
        if not response:
            self.log_result("Party Balance Update", False, "Failed to connect to party endpoint")
            return False
        
        if response.status_code != 200:
            self.log_result("Party Balance Update", False, f"HTTP {response.status_code}", response.text)
            return False
        
        try:
            party = response.json()
            
            # Balance should be positive (350.0) after sale order
            expected_balance = 350.0
            if party.get('balance') != expected_balance:
                self.log_result("Party Balance Update", False, f"Wrong balance: {party.get('balance')}, expected {expected_balance}")
                return False
            
            self.log_result("Party Balance Update", True, f"Party balance correctly updated to {party['balance']}")
            return True
            
        except json.JSONDecodeError:
            self.log_result("Party Balance Update", False, "Invalid JSON response")
            return False
    
    def test_order_status_updates(self):
        """Test updating order status from start -> inprocess -> completed"""
        print("\n=== Testing Order Status Updates ===")
        
        if not self.order_ids:
            self.log_result("Order Status Updates", False, "No order ID available")
            return False
        
        order_id = self.order_ids[0]
        
        # Update to inprocess
        response = self.make_request("PATCH", f"/orders/{order_id}", {"status": "inprocess"})
        if not response or response.status_code != 200:
            self.log_result("Order Status Updates", False, f"Failed to update to inprocess: {response.status_code if response else 'No response'}")
            return False
        
        try:
            order = response.json()
            if order['status'] != 'inprocess':
                self.log_result("Order Status Updates", False, f"Status not updated to inprocess: {order['status']}")
                return False
        except json.JSONDecodeError:
            self.log_result("Order Status Updates", False, "Invalid JSON response for inprocess update")
            return False
        
        # Update to completed
        response = self.make_request("PATCH", f"/orders/{order_id}", {"status": "completed"})
        if not response or response.status_code != 200:
            self.log_result("Order Status Updates", False, f"Failed to update to completed: {response.status_code if response else 'No response'}")
            return False
        
        try:
            order = response.json()
            if order['status'] != 'completed':
                self.log_result("Order Status Updates", False, f"Status not updated to completed: {order['status']}")
                return False
            
            # Verify completed orders have high priority (9999)
            if order['priority'] != 9999:
                self.log_result("Order Status Updates", False, f"Completed order priority is {order['priority']}, expected 9999")
                return False
            
            self.log_result("Order Status Updates", True, f"Order status updated: start -> inprocess -> completed with priority {order['priority']}")
            return True
            
        except json.JSONDecodeError:
            self.log_result("Order Status Updates", False, "Invalid JSON response for completed update")
            return False
    
    def test_create_purchase_order(self):
        """Test creating a purchase order for Party P1 with product Z"""
        print("\n=== Testing Purchase Order Creation ===")
        
        if not self.party_id:
            self.log_result("Purchase Order Creation", False, "No party ID available")
            return False
        
        if 'Z' not in self.product_ids:
            self.log_result("Purchase Order Creation", False, "Product Z not available")
            return False
        
        # Create purchase order
        order_data = {
            "party_id": self.party_id,
            "order_type": "purchase",
            "products": [
                {
                    "product_id": self.product_ids['Z'],
                    "product_name": "Z",
                    "quantity": 3.0,
                    "price": 80.0,
                    "weight": 1.5
                }
            ]
        }
        
        response = self.make_request("POST", "/orders", order_data)
        if not response:
            self.log_result("Purchase Order Creation", False, "Failed to connect to orders endpoint")
            return False
        
        if response.status_code != 200:
            self.log_result("Purchase Order Creation", False, f"HTTP {response.status_code}", response.text)
            return False
        
        try:
            order = response.json()
            
            # Verify order type and calculations
            expected_total_price = 3.0 * 80.0  # 240.0
            
            if order['order_type'] != 'purchase':
                self.log_result("Purchase Order Creation", False, f"Wrong order_type: {order['order_type']}")
                return False
            
            if order['total_price'] != expected_total_price:
                self.log_result("Purchase Order Creation", False, f"Wrong total_price: {order['total_price']}, expected {expected_total_price}")
                return False
            
            self.order_ids.append(order['id'])
            self.log_result("Purchase Order Creation", True, f"Created purchase order with total_price={order['total_price']}")
            return True
            
        except json.JSONDecodeError:
            self.log_result("Purchase Order Creation", False, "Invalid JSON response")
            return False
    
    def test_purchase_material_transaction(self):
        """Test material transaction for purchase order (negative amount)"""
        print("\n=== Testing Purchase Material Transaction ===")
        
        if not self.party_id:
            self.log_result("Purchase Material Transaction", False, "No party ID available")
            return False
        
        # Get material transactions for the party
        response = self.make_request("GET", "/material-transactions", params={"party_id": self.party_id})
        if not response or response.status_code != 200:
            self.log_result("Purchase Material Transaction", False, f"Failed to get material transactions")
            return False
        
        try:
            transactions = response.json()
            
            # Look for purchase transaction with negative amount
            purchase_transaction = None
            for transaction in transactions:
                if transaction.get('order_type') == 'purchase' and transaction.get('amount', 0) < 0:
                    purchase_transaction = transaction
                    break
            
            if not purchase_transaction:
                self.log_result("Purchase Material Transaction", False, "No negative purchase material transaction found")
                return False
            
            # Verify amount is negative (-240.0 from purchase order)
            expected_amount = -240.0
            if purchase_transaction['amount'] != expected_amount:
                self.log_result("Purchase Material Transaction", False, f"Wrong amount: {purchase_transaction['amount']}, expected {expected_amount}")
                return False
            
            self.log_result("Purchase Material Transaction", True, f"Purchase material transaction created with amount={purchase_transaction['amount']}")
            return True
            
        except json.JSONDecodeError:
            self.log_result("Purchase Material Transaction", False, "Invalid JSON response")
            return False
    
    def test_order_reordering(self):
        """Test reordering orders with POST /api/orders/reorder"""
        print("\n=== Testing Order Reordering ===")
        
        if len(self.order_ids) < 2:
            self.log_result("Order Reordering", False, "Need at least 2 orders for reordering test")
            return False
        
        # Reorder the orders (reverse the current order)
        reorder_data = list(reversed(self.order_ids))
        
        response = self.make_request("POST", "/orders/reorder", reorder_data)
        if not response:
            self.log_result("Order Reordering", False, "Failed to connect to reorder endpoint")
            return False
        
        if response.status_code != 200:
            self.log_result("Order Reordering", False, f"HTTP {response.status_code}", response.text)
            return False
        
        try:
            result = response.json()
            if 'message' in result and 'success' in result['message'].lower():
                self.log_result("Order Reordering", True, "Orders reordered successfully")
                return True
            else:
                self.log_result("Order Reordering", True, f"Reorder response: {result}")
                return True
                
        except json.JSONDecodeError:
            self.log_result("Order Reordering", False, "Invalid JSON response")
            return False
    
    def test_financial_transactions(self):
        """Test creating payment and receipt transactions"""
        print("\n=== Testing Financial Transactions ===")
        
        if not self.party_id:
            self.log_result("Financial Transactions", False, "No party ID available")
            return False
        
        # Create a payment transaction (should decrease balance)
        payment_data = {
            "party_id": self.party_id,
            "amount": 100.0,
            "payment_type": "payment",
            "payment_method": "cash",
            "description": "Test payment"
        }
        
        response = self.make_request("POST", "/financial-transactions", payment_data)
        if not response or response.status_code != 200:
            self.log_result("Financial Transactions", False, f"Failed to create payment transaction")
            return False
        
        # Create a receipt transaction (should increase balance)
        receipt_data = {
            "party_id": self.party_id,
            "amount": 50.0,
            "payment_type": "receipt",
            "payment_method": "bank",
            "description": "Test receipt"
        }
        
        response = self.make_request("POST", "/financial-transactions", receipt_data)
        if not response or response.status_code != 200:
            self.log_result("Financial Transactions", False, f"Failed to create receipt transaction")
            return False
        
        # Get financial transactions
        response = self.make_request("GET", "/financial-transactions", params={"party_id": self.party_id})
        if not response or response.status_code != 200:
            self.log_result("Financial Transactions", False, f"Failed to get financial transactions")
            return False
        
        try:
            transactions = response.json()
            if len(transactions) < 2:
                self.log_result("Financial Transactions", False, f"Expected at least 2 transactions, got {len(transactions)}")
                return False
            
            self.log_result("Financial Transactions", True, f"Created and retrieved {len(transactions)} financial transactions")
            return True
            
        except json.JSONDecodeError:
            self.log_result("Financial Transactions", False, "Invalid JSON response")
            return False
    
    def test_final_party_balance(self):
        """Test final party balance after all transactions"""
        print("\n=== Testing Final Party Balance ===")
        
        if not self.party_id:
            self.log_result("Final Party Balance", False, "No party ID available")
            return False
        
        # Get final party balance
        response = self.make_request("GET", f"/parties/{self.party_id}")
        if not response or response.status_code != 200:
            self.log_result("Final Party Balance", False, f"Failed to get party details")
            return False
        
        try:
            party = response.json()
            
            # Expected balance calculation:
            # Initial: 0
            # Sale order: +350 (material transaction)
            # Purchase order: -240 (material transaction)  
            # Payment: +100 (financial transaction - payment decreases what party owes, so increases balance)
            # Receipt: -50 (financial transaction - receipt decreases balance)
            # Expected: 0 + 350 - 240 + 100 - 50 = 160
            
            current_balance = party.get('balance', 0)
            self.log_result("Final Party Balance", True, f"Final party balance: {current_balance}")
            return True
            
        except json.JSONDecodeError:
            self.log_result("Final Party Balance", False, "Invalid JSON response")
            return False
    
    def run_all_tests(self):
        """Run all backend tests"""
        print(f"🚀 Starting Backend API Tests")
        print(f"📡 Base URL: {self.base_url}")
        print("=" * 60)
        
        tests = [
            self.test_products_api,
            self.test_parties_api,
            self.test_create_sale_order,
            self.test_material_transaction_auto_creation,
            self.test_party_balance_update,
            self.test_order_status_updates,
            self.test_create_purchase_order,
            self.test_purchase_material_transaction,
            self.test_order_reordering,
            self.test_financial_transactions,
            self.test_final_party_balance
        ]
        
        passed = 0
        failed = 0
        
        for test in tests:
            try:
                if test():
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                print(f"❌ FAIL {test.__name__}: Exception occurred - {str(e)}")
                failed += 1
        
        print("\n" + "=" * 60)
        print(f"📊 TEST SUMMARY")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"📈 Success Rate: {(passed/(passed+failed)*100):.1f}%" if (passed+failed) > 0 else "0%")
        
        return failed == 0

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)