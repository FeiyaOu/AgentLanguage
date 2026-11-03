"""Generation contract tests; no live model calls or API keys required."""
import json
import os
import unittest
from unittest.mock import patch

os.environ.setdefault("OPENAI_API_KEY", "test-key")

from main import GeneratePracticeRequest, generate_practice, HTTPException
from pydantic import ValidationError


def question(number):
    return {
        "question": f"Question {number}", "type": "multiple_choice",
        "correct_answer": "A", "options": ["A", "B", "C", "D"],
    }


class PracticeGenerationTests(unittest.TestCase):
    @patch("main.GeneratePracticeTool")
    def test_first_question_and_remaining_batch(self, tool):
        tool.return_value.execute.side_effect = [
            json.dumps([question(1)]),
            json.dumps([question(i) for i in range(2, 6)]),
        ]
        first = generate_practice(GeneratePracticeRequest(topic="Travel", count=1))
        self.assertEqual(len(first["exercises"]), 1)
        rest = generate_practice(GeneratePracticeRequest(
            topic="Travel", count=4, exclude_questions=["Question 1"],
        ))
        self.assertEqual(len(rest["exercises"]), 4)
        self.assertEqual(tool.return_value.execute.call_args.kwargs["exclude_questions"], ["Question 1"])

    @patch("main.GeneratePracticeTool")
    def test_partial_or_duplicate_batch_is_rejected(self, tool):
        for payload, count, excluded in [([question(1)], 4, []), ([question(1)], 1, ["Question 1"])]:
            tool.return_value.execute.return_value = json.dumps(payload)
            with self.assertRaises(HTTPException) as error:
                generate_practice(GeneratePracticeRequest(topic="Travel", count=count, exclude_questions=excluded))
            self.assertEqual(error.exception.status_code, 502)

    def test_count_limits(self):
        for count in [0, 6]:
            with self.assertRaises(ValidationError):
                GeneratePracticeRequest(topic="Travel", count=count)

    @patch("main.GeneratePracticeTool")
    def test_reordering_compares_sentence_not_shared_instruction(self, tool):
        instruction = "Reorder the words to form a correct sentence."
        exercise = {
            "question": instruction, "type": "sentence_reordering",
            "correct_answer": "I would like coffee.",
            "tokens": ["coffee", "like", "I", "would"],
        }
        tool.return_value.execute.return_value = json.dumps([exercise])
        result = generate_practice(GeneratePracticeRequest(
            topic="Travel", count=1, exclude_questions=[instruction, "I would like tea."],
        ))
        self.assertEqual(len(result["exercises"]), 1)
        with self.assertRaises(HTTPException) as error:
            generate_practice(GeneratePracticeRequest(
                topic="Travel", count=1, exclude_questions=["I would like coffee."],
            ))
        self.assertEqual(error.exception.status_code, 502)


if __name__ == "__main__":
    unittest.main()
