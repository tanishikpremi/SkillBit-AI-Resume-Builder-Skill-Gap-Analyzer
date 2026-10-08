import re
from typing import List
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

STOP_WORDS = {
    "with", "and", "or", "in", "of", "for", "the", "a", "an", "to", "on", "at", "by", "is", "are"
}

class SemanticEmbeddingService:
    """
    Robust hybrid semantic similarity service combining word TF-IDF,
    token set resonance, and character n-gram subword matching.
    """
    def __init__(self):
        self.word_vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words="english")
        self.char_vectorizer = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5))

    def calculate_similarity(self, text_a: str, text_b: str) -> float:
        """
        Calculates cosine/hybrid similarity between two text snippets in [0.0, 1.0].
        """
        if not text_a.strip() or not text_b.strip():
            return 0.0
            
        try:
            # 1. Word TF-IDF
            w_mat = self.word_vectorizer.fit_transform([text_a, text_b])
            w_sim = float(cosine_similarity(w_mat[0:1], w_mat[1:2])[0][0])
        except Exception:
            w_sim = 0.0

        try:
            # 2. Token overlap ratio
            tokens_a = set(w for w in re.findall(r"\b\w+\b", text_a.lower()) if w not in STOP_WORDS)
            tokens_b = set(w for w in re.findall(r"\b\w+\b", text_b.lower()) if w not in STOP_WORDS)
            token_sim = (len(tokens_a & tokens_b) / len(tokens_a | tokens_b)) if (tokens_a and tokens_b) else 0.0
        except Exception:
            token_sim = 0.0

        try:
            # 3. Char n-gram (catches subword stems, e.g. microservices <-> services)
            c_mat = self.char_vectorizer.fit_transform([text_a, text_b])
            c_sim = float(cosine_similarity(c_mat[0:1], c_mat[1:2])[0][0])
        except Exception:
            c_sim = 0.0

        combined = 0.40 * w_sim + 0.35 * token_sim + 0.25 * c_sim
        return float(np.clip(combined, 0.0, 1.0))

    def find_best_semantic_match(self, target_requirement: str, candidate_snippets: List[str]) -> tuple[float, str]:
        """
        Returns (highest_similarity_score, best_matching_snippet).
        """
        if not candidate_snippets or not target_requirement.strip():
            return 0.0, ""
            
        best_score = 0.0
        best_snippet = ""
        
        for snippet in candidate_snippets:
            score = self.calculate_similarity(target_requirement, snippet)
            if score > best_score:
                best_score = score
                best_snippet = snippet
                
        return best_score, best_snippet

embedding_service = SemanticEmbeddingService()
