"""AI Quiz Generator and automated grading engine with topic mastery tracking."""

import re
from typing import Any


CURATED_BANKS: dict[str, list[dict[str, Any]]] = {
    "CSC301": [
        {
            "type": "mcq",
            "topic": "Dynamic Programming",
            "prompt": "Which two properties are required for a problem to be solved effectively using Dynamic Programming?",
            "options": [
                "Optimal substructure and overlapping subproblems",
                "Greedy choice and sorted input order",
                "Constant space and recursion depth <= 2",
                "Graph acyclicity and unit edge weights",
            ],
            "answer": "Optimal substructure and overlapping subproblems",
            "explanation": "Dynamic Programming caches solutions to overlapping subproblems and combines optimal sub-solutions.",
        },
        {
            "type": "mcq",
            "topic": "Graph Algorithms",
            "prompt": "What is the time complexity of Dijkstra's algorithm with a binary min-heap on a graph with V vertices and E edges?",
            "options": ["O((V + E) log V)", "O(V^3)", "O(E log E + V^2)", "O(V + E)"],
            "answer": "O((V + E) log V)",
            "explanation": "Each vertex extraction and edge relaxation takes O(log V) with a binary heap.",
        },
        {
            "type": "mcq",
            "topic": "Divide & Conquer",
            "prompt": "Using the Master Theorem, what is the asymptotic bound for T(n) = 2T(n/2) + O(n)?",
            "options": ["O(n log n)", "O(n)", "O(n^2)", "O(log n)"],
            "answer": "O(n log n)",
            "explanation": "Case 2 of the Master Theorem applies because n^(log_2 2) = n matches the combine cost O(n).",
        },
        {
            "type": "mcq",
            "topic": "Trees & Hashing",
            "prompt": "What guarantees O(log n) worst-case lookup in a balanced binary search tree such as an AVL or Red-Black tree?",
            "options": [
                "Height is bounded by O(log n) via rotations",
                "Keys are stored in contiguous memory arrays",
                "Hash collisions are resolved by chaining",
                "Nodes only have at most one child",
            ],
            "answer": "Height is bounded by O(log n) via rotations",
            "explanation": "Self-balancing rotations maintain logarithmic tree height even on sorted insertions.",
        },
        {
            "type": "short",
            "topic": "Memoization",
            "prompt": "In one short phrase, how does top-down memoization differ from bottom-up tabulation?",
            "options": [],
            "answer": "recursion",
            "keywords": ["recursion", "recursive", "cache", "demand", "top-down"],
            "explanation": "Top-down memoization uses recursion with caching on demand, whereas tabulation fills a table iteratively.",
        },
    ],
    "MAT201": [
        {
            "type": "mcq",
            "topic": "Linear Algebra",
            "prompt": "When is an n x n matrix A guaranteed to be invertible?",
            "options": [
                "When det(A) != 0",
                "When all diagonal entries are positive",
                "When A is symmetric",
                "When trace(A) != 0",
            ],
            "answer": "When det(A) != 0",
            "explanation": "A square matrix is invertible if and only if its determinant is nonzero (full rank).",
        },
        {
            "type": "mcq",
            "topic": "Eigenvalues",
            "prompt": "Which equation defines an eigenvalue lambda and nonzero eigenvector v of matrix A?",
            "options": ["A v = lambda v", "A + v = lambda", "det(A + lambda I) = 1", "v^T A = 0"],
            "answer": "A v = lambda v",
            "explanation": "Multiplying an eigenvector v by A scales v by the scalar eigenvalue lambda.",
        },
        {
            "type": "mcq",
            "topic": "Vector Spaces",
            "prompt": "By the Rank-Nullity Theorem, for an m x n matrix A, what equals n?",
            "options": ["rank(A) + nullity(A)", "rank(A) * nullity(A)", "det(A) + trace(A)", "m - rank(A)"],
            "answer": "rank(A) + nullity(A)",
            "explanation": "The number of columns equals the dimension of the column space (rank) plus the null space (nullity).",
        },
        {
            "type": "short",
            "topic": "Orthogonality",
            "prompt": "What is the dot product of two orthogonal (perpendicular) vectors?",
            "options": [],
            "answer": "0",
            "keywords": ["0", "zero"],
            "explanation": "Two vectors are orthogonal if and only if their inner (dot) product equals zero.",
        },
    ],
}


def generate_questions(
    source_text: str | None,
    topic: str | None,
    course_code: str,
    num_questions: int = 5,
    difficulty: str = "medium",
) -> list[dict[str, Any]]:
    questions: list[dict[str, Any]] = []
    upper_code = course_code.upper().strip()

    # 1. Extract grounded facts from note text if provided
    if source_text:
        bullet_lines = [
            re.sub(r"^[-*#\d.)\s]+", "", ln).strip()
            for ln in source_text.splitlines()
            if len(ln.strip()) > 32 and not ln.strip().startswith("*")
        ]
        for idx, line in enumerate(bullet_lines[: max(2, num_questions - 2)]):
            clean = line.replace("**", "")
            if ":" in clean and len(clean.split(":", 1)[0]) < 48:
                concept, definition = [p.strip() for p in clean.split(":", 1)]
                questions.append(
                    {
                        "id": f"q{len(questions) + 1}",
                        "type": "mcq",
                        "topic": concept[:40],
                        "difficulty": difficulty,
                        "prompt": f"According to your {upper_code} notes, which statement accurately describes '{concept}'?",
                        "options": [
                            definition[:130],
                            "It only applies to static single-threaded lookup tables with zero memory overhead.",
                            "It bypasses validation constraints and cannot be used in academic or production systems.",
                            "It replaces all data structures with unordered linear scans.",
                        ],
                        "answer": definition[:130],
                        "explanation": f"Directly grounded in your digitized {upper_code} note on {concept}.",
                    }
                )
            elif idx == 0:
                words = [w.strip(".,;:()") for w in clean.split() if len(w) > 5]
                key_word = words[0] if words else (topic or upper_code)
                questions.append(
                    {
                        "id": f"q{len(questions) + 1}",
                        "type": "short",
                        "topic": (topic or upper_code)[:40],
                        "difficulty": difficulty,
                        "prompt": f"Briefly explain the core idea behind '{key_word}' from your {upper_code} study note.",
                        "options": [],
                        "answer": key_word,
                        "keywords": [w.lower() for w in words[:4]] or [key_word.lower()],
                        "explanation": f"Reference from note: {clean[:180]}",
                    }
                )

    # 2. Supplement from curated course bank or topic template up to num_questions
    bank = CURATED_BANKS.get(upper_code) or CURATED_BANKS["CSC301"]
    for item in bank:
        if len(questions) >= num_questions:
            break
        q_copy = dict(item)
        q_copy["id"] = f"q{len(questions) + 1}"
        q_copy["difficulty"] = difficulty
        questions.append(q_copy)

    # 3. Guarantee exact requested count
    label = topic or upper_code or "Course Material"
    while len(questions) < num_questions:
        idx = len(questions) + 1
        questions.append(
            {
                "id": f"q{idx}",
                "type": "mcq",
                "topic": label[:40],
                "difficulty": difficulty,
                "prompt": f"Which study strategy best reinforces mastery of {label} before an exam?",
                "options": [
                    "Active recall with timed spaced-repetition quizzes and error review",
                    "Passive re-reading the night before without testing",
                    "Skipping difficult topics to focus only on mastered chapters",
                    "Avoiding practice problems until exam day",
                ],
                "answer": "Active recall with timed spaced-repetition quizzes and error review",
                "explanation": "Spaced active recall strengthens retrieval pathways and surfaces weak subtopics early.",
            }
        )

    return questions[:num_questions]


def grade_quiz(questions: list[dict[str, Any]], submitted_answers: dict[str, str]) -> dict[str, Any]:
    correct = 0
    results: list[dict[str, Any]] = []
    topic_stats: dict[str, dict[str, int]] = {}

    for q in questions:
        qid = q["id"]
        user_ans = (submitted_answers.get(qid) or "").strip()
        topic = q.get("topic") or "General"
        topic_stats.setdefault(topic, {"correct": 0, "total": 0})
        topic_stats[topic]["total"] += 1

        if q.get("type") == "short":
            keywords = [k.lower() for k in q.get("keywords", [q["answer"]])]
            is_correct = bool(user_ans) and (
                any(k in user_ans.lower() for k in keywords) or len(user_ans) >= 18
            )
        else:
            is_correct = user_ans.lower() == str(q["answer"]).strip().lower()

        if is_correct:
            correct += 1
            topic_stats[topic]["correct"] += 1

        results.append(
            {
                "id": qid,
                "topic": topic,
                "prompt": q["prompt"],
                "your_answer": user_ans,
                "correct_answer": q["answer"],
                "is_correct": is_correct,
                "explanation": q.get("explanation", ""),
            }
        )

    total = max(len(questions), 1)
    score_percent = round((correct / total) * 100.0, 1)
    topic_breakdown = {
        t: round((vals["correct"] / max(vals["total"], 1)) * 100.0, 1)
        for t, vals in topic_stats.items()
    }
    weak_topics = [t for t, pct in topic_breakdown.items() if pct < 70.0]

    return {
        "score_percent": score_percent,
        "correct_count": correct,
        "total_questions": len(questions),
        "topic_breakdown": topic_breakdown,
        "weak_topics": weak_topics,
        "results": results,
    }
