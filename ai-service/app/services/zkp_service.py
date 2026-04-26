import base64
import hashlib
import hmac
import os
from dataclasses import dataclass


@dataclass(frozen=True)
class ProofBundle:
    proof: str
    public_inputs: dict


class ZkpService:
    def __init__(self) -> None:
        self._secret = os.getenv("ZKP_DEMO_SECRET", "change_me_in_production").encode()

    def create_gte_proof(self, value: int, threshold: int, salt: str) -> ProofBundle:
        ok = value >= threshold
        msg = f"gte|{threshold}|{salt}|{int(ok)}".encode()
        digest = hmac.new(self._secret, msg, hashlib.sha256).digest()
        proof = base64.urlsafe_b64encode(digest).decode()
        return ProofBundle(
            proof=proof,
            public_inputs={
                "threshold": threshold,
                "salt": salt,
                "result": ok,
            },
        )

    def verify_gte_proof(self, proof: str, threshold: int, salt: str, result: bool) -> bool:
        msg = f"gte|{threshold}|{salt}|{int(result)}".encode()
        digest = hmac.new(self._secret, msg, hashlib.sha256).digest()
        expected = base64.urlsafe_b64encode(digest).decode()
        return hmac.compare_digest(proof, expected)
