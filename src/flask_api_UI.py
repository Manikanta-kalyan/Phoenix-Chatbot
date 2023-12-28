from flask import Flask, request, jsonify, render_template
import re
import nltk
import os
import warnings
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize
from joblib import load
from chatterbot import ChatBot
from chatterbot.trainers import ChatterBotCorpusTrainer
import pysolr
import string
from flask_cors import CORS, cross_origin

app = Flask(__name__)
CORS(app, support_credentials=True)

nltk.download('punkt')
nltk.download('wordnet')

# Global variable to store the chatbot instance
chatbot_instance = None

# Define create_chatbot function
def create_chatbot():
    # Create a new chatbot instance only if it hasn't been initialized yet
    global chatbot_instance
    if chatbot_instance is None:
        chatbot_instance = ChatBot(
            'ChitChatBot',
            preprocessors=[
                'chatterbot.preprocessors.clean_whitespace',  # Clean whitespace
                'chatterbot.preprocessors.convert_to_ascii'   # Convert to ASCII
            ],
            logic_adapters=[
                {
                    'import_path': 'chatterbot.logic.BestMatch',
                    'default_response': 'I am sorry, but I do not understand.',
                    'maximum_similarity_threshold': 0.70
                },
                {
                    'import_path': 'chatterbot.logic.MathematicalEvaluation'
                },
            ],
        )
        # Train the chatbot only if it hasn't been trained yet
        trainer = ChatterBotCorpusTrainer(chatbot_instance)
        if not chatbot_instance.storage.count():
            trainer.train('chatterbot.corpus.english')

def get_chatbot_response(chatbot, user_input):
    # Get the bot's response for the given user input
    print('waitinghere')
    response = chatbot.get_response(user_input)
    return response.text

chatbot_instance = create_chatbot()
def get_wikibot_response(user_input, input_topics):
    print(type(input_topics),print(input_topics))
    # Tokenization
    tokens = word_tokenize(user_input.lower())  # Convert to lowercase for uniformity
    # Stop words removal
    custom_stopwords_file = 'stopwords-en.txt'
    # Read custom stopwords from file
    custom_stopwords = set()
    if os.path.exists(custom_stopwords_file):
        with open(custom_stopwords_file, 'r', encoding='utf-8') as file:
            custom_stopwords = set(file.read().splitlines())

    # Add NLTK's default English stopwords to your custom stopwords
    stop_words = set(stopwords.words('english'))
    stop_words.update(custom_stopwords)
    filtered_tokens = [token for token in tokens if token not in stop_words]
    # print(len(stop_words))

    # Lemmatization using WordNet lemmatizer
    lemmatizer = WordNetLemmatizer()
    lemmatized_tokens = [lemmatizer.lemmatize(token) for token in filtered_tokens]

    # Removing special characters and punctuation
    cleaned_tokens = [re.sub(r'[^\w\s]', '', token) for token in lemmatized_tokens]
    filtered_list = [item for item in cleaned_tokens if item.strip()]

    # Create a search query using the processed tokens
    search_query = ' '.join(filtered_list)

    print("Preprocessed_query: ", search_query)  # This processed query can be used in your Solr search

    if not search_query:
        return {'error': "Please provide a valid question or input"}
    else:
        # Create a Solr client instance
        solr = pysolr.Solr('http://34.125.63.64:8983/solr/IRP3/', always_commit=True)  # Update with your Solr core URL

        if not input_topics:
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore", category=UserWarning)
                    loaded_model = load('topic_classifier_MLNB.joblib')
            except UserWarning as e:
                print(f"Caught a UserWarning: {e}")
                loaded_model = None  # Set the loaded model to None or handle it accordingly

            if loaded_model:
                loaded_classifier = loaded_model['classifier']
                loaded_vectorizer = loaded_model['vectorizer']
                vectorized_text = loaded_vectorizer.transform([search_query])
                predicted_topic = loaded_classifier.predict(vectorized_text)[0]
                print('predicted topic', predicted_topic)
                input_topics.append(predicted_topic)
                print(input_topics)

        # Constructing the topic filter string
        topic_query = ''
        if input_topics:
            topic_query = ' OR '.join([f'topic:{topic}' for topic in input_topics])

        # Perform a query
        results = solr.search(f'summary:{search_query}', fq=topic_query, **{
            'q.op': 'OR',
            'fl': 'title, summary, topic, url',  # Fields to retrieve
            'sort': 'score desc',  # Sorting by score in descending order
            'indent': 'true',  # Indent the JSON output for readability
            'useParams': '',
            'qf': 'title^5.0 summary^3.0',  # Boosting title and summary fields
            'defType': 'edismax',  # Using edismax query parser
            'mm': '80%',  # Mandatory match percentage (all terms should match)
            # 'q.alt': '*:*',  # Alternative query if the main query doesn't return results
            'ps': '10',  # Specifying the phrase slop to consider phrase queries
            'pf': 'title^10 summary^5',  # Phrase boosting in the specified field
            'rows':3,
        })
        # Check if results are empty
        if len(results) == 0:
            return {'error': "Oops, I couldn't find any info matching your request. How about trying a different search query?"}
        else:
            # Process the query results
            # print("Top 10 results for our understanding")
            # for result in results:
            #     print(result)  # Print or process each search result as needed
            # print("DOCUMENT TO USER")
            # Retrieve the first document
            first_result = results.docs[0]
            return {
                'title': first_result['title'],
                'summary': first_result['summary'][:200] + "...",
                'url': first_result['url'],
                'topic': first_result['topic']
            }
@app.route('/')
def home():
    return render_template('main.html')

@app.route('/bot', methods=['POST'])
@cross_origin(supports_credentials=True)
def get_response():
    # Create the chatbot instance if it hasn't been initialized
    create_chatbot()
    # data = request.get_json()
    # user_input = data.get('user_input')
    # user_topics = data.get('user_topics', [])
    user_input = request.form.get('user_input')
    user_topics = request.form.get('user_topics')

    print('****',user_input,user_topics)
    if user_topics is not None:
        user_topics = user_topics.split(',')
    else:
        user_topics = []
    # if len(user_topics)>0:
    #     user_topics = user_topics.split(',')

    if user_input.lower() in ['exit', 'quit', 'stop', 'bye', 'goodbye', 'see you', 'adios']:
        return jsonify({'response': {'end': "Goodbye!"}})

    if not user_input.strip():
        return jsonify({'response': {'error': "Please enter something valid."}})


    if all(char in string.punctuation or char.isspace() for char in user_input):
        return jsonify({'response': {'error': "Apologies, could you please rephrase your question without unnecessary punctuation so that I can assist you effectively?"}})

    if user_topics:
        try:
            response = get_wikibot_response(user_input, user_topics)
        except Exception as e:
            response = {'error': "We are unable to process your request at this time, Please try again"}
    else:
        try:
            response = get_chatbot_response(chatbot_instance, user_input)
            if response == 'I am sorry, but I do not understand.':
                response = get_wikibot_response(user_input, user_topics)
        except Exception as e:
            response = {'error': "We are unable to process your request at this time, Please try again"}

    return jsonify({'response': response})


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000)
