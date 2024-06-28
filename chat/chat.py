from langchain_community.vectorstores import Chroma
from langchain_community.chat_models import ChatOllama
from langchain.schema.output_parser import StrOutputParser
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import FastEmbedEmbeddings
from langchain.schema.runnable import RunnablePassthrough
from langchain.prompts import PromptTemplate
import chromadb.utils.embedding_functions as embedding_functions


class TurreroChat:
    vector_store = None
    retriever = None
    chain = None

    def __init__(self):
        self.model = ChatOllama(model="llama3")
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1024, chunk_overlap=100)
        self.prompt = PromptTemplate.from_template(
            """
            <s> [INST] Eres un asistente para tareas de tipo 'pregunta y respuesta'. Utilice las siguientes piezas de contexto recuperado para responder la pregunta. Si no sabe la respuesta, simplemente diga que no la sabe. Usa tres oraciones como máximo y mantén la respuesta concisa.[/INST] </s>
            [INST] Pregunta: {question}
            Contexto: {context}
            Respuesta: [/INST]
            """
        )

        vector_store = Chroma(
            "glossary", embedding_function=FastEmbedEmbeddings())

        self.retriever = vector_store.as_retriever(
            search_type="similarity_score_threshold",
            search_kwargs={
                "k": 3,
                "score_threshold": 0.5,
            },
        )
        self.chain = ({"context": self.retriever, "question": RunnablePassthrough()}
                      | self.prompt
                      | self.model
                      | StrOutputParser())

    def ask(self, query: str):
        if not self.chain:
            return "I am not ready yet."

        return self.chain.invoke(query)

    def clear(self):
        self.vector_store = None
        self.retriever = None
        self.chain = None
