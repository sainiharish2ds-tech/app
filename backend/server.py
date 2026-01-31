from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from bson import ObjectId


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class Product(BaseModel):
    id: Optional[str] = None
    name: str
    price: float
    weight: float
    description: Optional[str] = ""

class ProductCreate(BaseModel):
    name: str
    price: float
    weight: float
    description: Optional[str] = ""

class Party(BaseModel):
    id: Optional[str] = None
    name: str
    contact: Optional[str] = ""
    balance: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PartyCreate(BaseModel):
    name: str
    contact: Optional[str] = ""

class OrderProduct(BaseModel):
    product_id: str
    product_name: str
    quantity: float
    price: float
    weight: float

class Order(BaseModel):
    id: Optional[str] = None
    party_id: str
    party_name: str
    order_type: str  # "purchase" or "sale"
    products: List[OrderProduct]
    total_price: float
    total_weight: float
    status: str = "start"  # "start", "inprocess", "completed"
    priority: int = 0
    reference_order_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class OrderCreate(BaseModel):
    party_id: str
    order_type: str
    products: List[OrderProduct]
    reference_order_id: Optional[str] = None

class OrderUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[int] = None
    products: Optional[List[OrderProduct]] = None

class MaterialTransaction(BaseModel):
    id: Optional[str] = None
    party_id: str
    party_name: str
    order_id: str
    order_type: str
    amount: float
    description: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class FinancialTransaction(BaseModel):
    id: Optional[str] = None
    party_id: str
    party_name: str
    amount: float
    payment_type: str  # "payment" or "receipt"
    payment_method: Optional[str] = "cash"
    description: Optional[str] = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)

class FinancialTransactionCreate(BaseModel):
    party_id: str
    amount: float
    payment_type: str
    payment_method: Optional[str] = "cash"
    description: Optional[str] = ""


# Helper function to convert ObjectId to string
def object_id_to_str(doc):
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


# Products Routes
@api_router.post("/products", response_model=Product)
async def create_product(product: ProductCreate):
    product_dict = product.dict()
    result = await db.products.insert_one(product_dict)
    product_dict["id"] = str(result.inserted_id)
    return Product(**product_dict)

@api_router.get("/products", response_model=List[Product])
async def get_products():
    products = await db.products.find().to_list(1000)
    return [Product(**object_id_to_str(p)) for p in products]

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return Product(**object_id_to_str(product))

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str):
    result = await db.products.delete_one({"_id": ObjectId(product_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}


# Parties Routes
@api_router.post("/parties", response_model=Party)
async def create_party(party: PartyCreate):
    party_dict = party.dict()
    party_dict["balance"] = 0.0
    party_dict["created_at"] = datetime.utcnow()
    result = await db.parties.insert_one(party_dict)
    party_dict["id"] = str(result.inserted_id)
    return Party(**party_dict)

@api_router.get("/parties", response_model=List[Party])
async def get_parties():
    parties = await db.parties.find().to_list(1000)
    return [Party(**object_id_to_str(p)) for p in parties]

@api_router.get("/parties/{party_id}", response_model=Party)
async def get_party(party_id: str):
    party = await db.parties.find_one({"_id": ObjectId(party_id)})
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")
    return Party(**object_id_to_str(party))

@api_router.delete("/parties/{party_id}")
async def delete_party(party_id: str):
    result = await db.parties.delete_one({"_id": ObjectId(party_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Party not found")
    return {"message": "Party deleted"}


# Orders Routes
@api_router.post("/orders", response_model=Order)
async def create_order(order: OrderCreate):
    # Get party details
    party = await db.parties.find_one({"_id": ObjectId(order.party_id)})
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")
    
    # Calculate totals
    total_price = sum(p.quantity * p.price for p in order.products)
    total_weight = sum(p.quantity * p.weight for p in order.products)
    
    # Get max priority for this party
    max_priority_order = await db.orders.find_one(
        {"party_id": order.party_id, "status": {"$in": ["start", "inprocess"]}},
        sort=[("priority", -1)]
    )
    priority = (max_priority_order["priority"] + 1) if max_priority_order else 0
    
    order_dict = {
        "party_id": order.party_id,
        "party_name": party["name"],
        "order_type": order.order_type,
        "products": [p.dict() for p in order.products],
        "total_price": total_price,
        "total_weight": total_weight,
        "status": "start",
        "priority": priority,
        "reference_order_id": order.reference_order_id,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.orders.insert_one(order_dict)
    order_dict["id"] = str(result.inserted_id)
    
    # Create material transaction
    transaction_amount = total_price if order.order_type == "sale" else -total_price
    material_transaction = {
        "party_id": order.party_id,
        "party_name": party["name"],
        "order_id": order_dict["id"],
        "order_type": order.order_type,
        "amount": transaction_amount,
        "description": f"{order.order_type.capitalize()} order created",
        "created_at": datetime.utcnow()
    }
    await db.material_transactions.insert_one(material_transaction)
    
    # Update party balance
    await db.parties.update_one(
        {"_id": ObjectId(order.party_id)},
        {"$inc": {"balance": transaction_amount}}
    )
    
    return Order(**order_dict)

@api_router.get("/orders", response_model=List[Order])
async def get_orders(party_id: Optional[str] = None, order_type: Optional[str] = None):
    query = {}
    if party_id:
        query["party_id"] = party_id
    if order_type:
        query["order_type"] = order_type
    
    orders = await db.orders.find(query).sort("priority", 1).to_list(1000)
    return [Order(**object_id_to_str(o)) for o in orders]

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return Order(**object_id_to_str(order))

@api_router.patch("/orders/{order_id}", response_model=Order)
async def update_order(order_id: str, update: OrderUpdate):
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if order is completed
    if order["status"] == "completed":
        raise HTTPException(status_code=400, detail="Cannot modify completed order")
    
    update_dict = {"updated_at": datetime.utcnow()}
    
    if update.status:
        update_dict["status"] = update.status
        
        # If completing order, adjust priority
        if update.status == "completed":
            # Get all orders for this party
            party_orders = await db.orders.find(
                {"party_id": order["party_id"], "status": {"$in": ["start", "inprocess"]}}
            ).to_list(1000)
            
            # Reorder priorities
            for idx, po in enumerate(sorted(party_orders, key=lambda x: x["priority"])):
                if str(po["_id"]) != order_id:
                    await db.orders.update_one(
                        {"_id": po["_id"]},
                        {"$set": {"priority": idx}}
                    )
            
            # Set completed order to high priority (will be at bottom)
            update_dict["priority"] = 9999
    
    if update.priority is not None:
        update_dict["priority"] = update.priority
    
    if update.products:
        total_price = sum(p.quantity * p.price for p in update.products)
        total_weight = sum(p.quantity * p.weight for p in update.products)
        update_dict["products"] = [p.dict() for p in update.products]
        update_dict["total_price"] = total_price
        update_dict["total_weight"] = total_weight
    
    await db.orders.update_one({"_id": ObjectId(order_id)}, {"$set": update_dict})
    
    updated_order = await db.orders.find_one({"_id": ObjectId(order_id)})
    return Order(**object_id_to_str(updated_order))

@api_router.post("/orders/reorder")
async def reorder_orders(order_ids: List[str]):
    """Reorder orders based on provided list"""
    for idx, order_id in enumerate(order_ids):
        await db.orders.update_one(
            {"_id": ObjectId(order_id)},
            {"$set": {"priority": idx, "updated_at": datetime.utcnow()}}
        )
    return {"message": "Orders reordered successfully"}


# Material Transactions Routes
@api_router.get("/material-transactions", response_model=List[MaterialTransaction])
async def get_material_transactions(party_id: Optional[str] = None):
    query = {}
    if party_id:
        query["party_id"] = party_id
    
    transactions = await db.material_transactions.find(query).sort("created_at", -1).to_list(1000)
    return [MaterialTransaction(**object_id_to_str(t)) for t in transactions]


# Financial Transactions Routes
@api_router.post("/financial-transactions", response_model=FinancialTransaction)
async def create_financial_transaction(transaction: FinancialTransactionCreate):
    # Get party details
    party = await db.parties.find_one({"_id": ObjectId(transaction.party_id)})
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")
    
    transaction_dict = transaction.dict()
    transaction_dict["party_name"] = party["name"]
    transaction_dict["created_at"] = datetime.utcnow()
    
    result = await db.financial_transactions.insert_one(transaction_dict)
    transaction_dict["id"] = str(result.inserted_id)
    
    # Update party balance
    # Payment: party pays us, reduces their balance (they owe less)
    # Receipt: we pay party, increases their balance (we owe more)
    balance_change = -transaction.amount if transaction.payment_type == "payment" else transaction.amount
    await db.parties.update_one(
        {"_id": ObjectId(transaction.party_id)},
        {"$inc": {"balance": balance_change}}
    )
    
    return FinancialTransaction(**transaction_dict)

@api_router.get("/financial-transactions", response_model=List[FinancialTransaction])
async def get_financial_transactions(party_id: Optional[str] = None):
    query = {}
    if party_id:
        query["party_id"] = party_id
    
    transactions = await db.financial_transactions.find(query).sort("created_at", -1).to_list(1000)
    return [FinancialTransaction(**object_id_to_str(t)) for t in transactions]


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
