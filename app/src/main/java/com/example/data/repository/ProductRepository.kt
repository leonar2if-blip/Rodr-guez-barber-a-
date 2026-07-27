package com.example.data.repository

import com.example.data.database.ProductDao
import com.example.data.database.ServiceDao
import com.example.data.models.Product
import com.example.data.models.Service
import com.example.service.ProductService
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.onStart

class ProductRepository(
    private val serviceDao: ServiceDao,
    private val productDao: ProductDao
) {
    private val productService = ProductService()

    val activeServices: Flow<List<Service>> = serviceDao.getActiveServices().onStart {
        refreshServices()
    }

    val allServices: Flow<List<Service>> = serviceDao.getAllServices().onStart {
        refreshServices()
    }

    val activeProducts: Flow<List<Product>> = productDao.getActiveProducts().onStart {
        refreshProducts()
    }

    val allProducts: Flow<List<Product>> = productDao.getAllProducts().onStart {
        refreshProducts()
    }

    suspend fun refreshServices() {
        try {
            val remote = productService.getServices()
            if (remote.isNotEmpty()) {
                serviceDao.insertAll(remote)
            }
        } catch (e: Exception) {
            // Use cached data when offline
        }
    }

    suspend fun refreshProducts() {
        try {
            val remote = productService.getProducts()
            if (remote.isNotEmpty()) {
                productDao.insertAll(remote)
            }
        } catch (e: Exception) {
            // Use cached data when offline
        }
    }

    suspend fun createService(service: Service): Result<Service> {
        val res = productService.createService(service)
        if (res.isSuccess) {
            res.getOrNull()?.let { serviceDao.insert(it) }
        }
        return res
    }

    suspend fun updateService(id: Long, updates: Map<String, Any?>, updatedService: Service): Result<Boolean> {
        val res = productService.updateService(id, updates)
        if (res.isSuccess) {
            serviceDao.insert(updatedService)
        }
        return res
    }

    suspend fun deleteService(id: Long): Result<Boolean> {
        val res = productService.deleteService(id)
        if (res.isSuccess) {
            serviceDao.deleteById(id)
        }
        return res
    }

    suspend fun createProduct(product: Product, image1: ByteArray? = null, name1: String? = null, image2: ByteArray? = null, name2: String? = null): Result<Product> {
        val res = productService.createProduct(product, image1, name1, image2, name2)
        if (res.isSuccess) {
            res.getOrNull()?.let { productDao.insert(it) }
        }
        return res
    }

    suspend fun updateProduct(id: Long, updates: Map<String, Any?>, updatedProduct: Product): Result<Boolean> {
        val res = productService.updateProduct(id, updates)
        if (res.isSuccess) {
            productDao.insert(updatedProduct)
        }
        return res
    }

    suspend fun deleteProduct(id: Long): Result<Boolean> {
        val res = productService.deleteProduct(id)
        if (res.isSuccess) {
            productDao.deleteById(id)
        }
        return res
    }
}
