from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.user import User
from app.models.product import Product
from app.models.ml_models import Score, SimilarProduct
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse, ProductWithScore

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=List[ProductWithScore])
@router.get("/", response_model=List[ProductWithScore])
async def list_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    include_inactive: bool = False,
):
    query = db.query(Product)
    if not include_inactive:
        query = query.filter(Product.is_active == True)
    products = query.all()

    result = []
    for p in products:
        latest_score = (
            db.query(Score)
            .filter(Score.product_id == p.id)
            .order_by(Score.period_date.desc())
            .first()
        )
        item = ProductWithScore(
            id=p.id,
            name=p.name,
            code=p.code,
            category=p.category,
            description=p.description,
            is_active=p.is_active,
            launch_date=p.launch_date,
            created_at=p.created_at,
            current_score=latest_score.performance_score if latest_score else None,
            current_tier=latest_score.performance_tier if latest_score else None,
            score_change=latest_score.score_change if latest_score else None,
        )
        result.append(item)
    return result


@router.get("/{product_id}")
async def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Latest score
    scores = (
        db.query(Score)
        .filter(Score.product_id == product_id)
        .order_by(Score.period_date.desc())
        .limit(12)
        .all()
    )

    # Similar products
    similar = (
        db.query(SimilarProduct)
        .filter(SimilarProduct.product_id == product_id)
        .order_by(SimilarProduct.similarity_score.desc())
        .limit(3)
        .all()
    )

    similar_details = []
    for s in similar:
        sp = db.query(Product).filter(Product.id == s.similar_product_id).first()
        if sp:
            similar_details.append({"product_id": sp.id, "name": sp.name, "similarity_score": s.similarity_score})

    return {
        "product": {
            "id": product.id,
            "name": product.name,
            "code": product.code,
            "category": product.category,
            "description": product.description,
            "is_active": product.is_active,
            "launch_date": product.launch_date,
        },
        "latest_score": {
            "performance_score": scores[0].performance_score if scores else None,
            "previous_score":    scores[0].previous_score    if scores else None,
            "score_change":      scores[0].score_change      if scores else None,
            "performance_tier":  scores[0].performance_tier  if scores else None,
            "previous_tier":     scores[0].previous_tier     if scores else None,
            "tier_changed":      bool(scores[0].tier_changed) if scores else False,
            "period_date":       str(scores[0].period_date)  if scores else None,
            "model_version":     scores[0].model_version     if scores else None,
            "confidence":        scores[0].confidence        if scores else None,
        } if scores else None,
        "score_history": [
            {
                "period_date":       str(s.period_date),
                "performance_score": s.performance_score,
                "performance_tier":  s.performance_tier,
                "score_change":      s.score_change,
            }
            for s in reversed(scores)   # oldest → newest for the trend chart
        ],
        "similar_products": similar_details,
    }


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "product_manager")),
):
    existing = db.query(Product).filter(
        (Product.name == payload.name) | (Product.code == payload.code)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Product with this name or code already exists")

    product = Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "product_manager")),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}")
async def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin")),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_active = False
    db.commit()
    return {"message": "Product deactivated"}
