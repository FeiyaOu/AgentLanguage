"""
CLI interface for the Language Learning Agent.
"""

import os
import json
from dotenv import load_dotenv
from agent.agent import LanguageLearningAgent


def print_header():
    """Print welcome header."""
    print("\n" + "="*60)
    print("🤖 AI Language Learning Agent")
    print("="*60)
    print("I'll help you practice English through adaptive exercises.")
    print("Type 'quit' or 'exit' to stop.\n")


def print_exercises(exercises):
    """Pretty print exercises for user."""
    print("\n" + "-"*60)
    print("📝 Practice Exercises:")
    print("-"*60)
    
    for i, ex in enumerate(exercises, 1):
        print(f"\n{i}. {ex['question']}")
        
        if ex['type'] == 'multiple_choice' and 'options' in ex:
            for j, option in enumerate(ex['options'], 1):
                print(f"   {chr(96+j)}) {option}")
        
        print()


def collect_answers(exercises):
    """Collect answers from user."""
    answers = []
    
    print("\n💡 Enter your answers (one per line):")
    
    for i, ex in enumerate(exercises, 1):
        while True:
            answer = input(f"Answer {i}: ").strip()
            if answer:
                answers.append(answer)
                break
            print("Please enter an answer.")
    
    return answers


def main():
    # Load environment variables
    load_dotenv()
    
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("❌ Error: OPENAI_API_KEY not found in environment")
        print("Please create a .env file with your OpenAI API key")
        return
    
    # Initialize agent
    print("\n🔄 Initializing agent...")
    agent = LanguageLearningAgent(api_key)
    
    print_header()
    
    # Main interaction loop
    while True:
        try:
            # Get user input
            user_input = input("You: ").strip()
            
            if user_input.lower() in ['quit', 'exit', 'bye']:
                print("\n👋 Goodbye! Keep practicing!")
                break
            
            if not user_input:
                continue
            
            # Process with agent
            print("\n🤔 Agent thinking...")
            response = agent.process_user_input(user_input)
            
            print(f"\n🤖 Agent: {response}")
            
            # Check if we have exercises to show
            exercises = agent.get_current_exercises()
            
            if exercises:
                print_exercises(exercises)
                
                # Ask if user wants to practice
                do_practice = input("\n📋 Ready to practice? (yes/no): ").strip().lower()
                
                if do_practice in ['yes', 'y']:
                    # Collect answers
                    answers = collect_answers(exercises)
                    
                    # Submit to agent for scoring
                    print("\n🔄 Analyzing your answers...")
                    
                    # Format as string for agent
                    answer_text = f"Here are my answers: {json.dumps(answers)}"
                    score_response = agent.process_user_input(answer_text)
                    
                    print(f"\n📊 {score_response}")
                    
                    # Ask if user wants to continue
                    continue_practice = input("\n🔁 Continue practicing? (yes/no): ").strip().lower()
                    
                    if continue_practice in ['yes', 'y']:
                        print("\n✅ Great! Let's continue...")
                    else:
                        print("\n👏 Great work today!")
                        break
        
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"\n❌ Error: {e}")
            print("Let's try again...")


if __name__ == "__main__":
    main()
