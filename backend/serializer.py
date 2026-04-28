from neo4j.time import Date, DateTime, Duration
from neo4j.graph import Node, Relationship

def serialize(obj):
    if isinstance(obj, (Date, DateTime)):
        return str(obj)
    if isinstance(obj, Duration):
        return str(obj)
    if isinstance(obj, Node):
        return {k: serialize(v) for k, v in dict(obj).items()}
    if isinstance(obj, Relationship):
        return {k: serialize(v) for k, v in dict(obj).items()}
    if isinstance(obj, dict):
        return {k: serialize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [serialize(i) for i in obj]
    return obj
